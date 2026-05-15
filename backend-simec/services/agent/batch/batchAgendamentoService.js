import { AgentSessionRepository } from '../session/agentSessionRepository.js';
import { montarRecomendacaoManutencao } from '../workflow/dbManager.js';
import { extrairCamposComIA } from '../agendamento/extractor/index.js';
import { mergeEstadoAgente } from '../agendamento/state/mergeEstadoAgente.js';
import { getSessionKey } from '../core/sessionKeys.js';

const BATCH_STEPS = {
  START: 'START',
  COLETANDO_DADOS: 'COLETANDO_DADOS',
  AGUARDANDO_CONFIRMACAO: 'AGUARDANDO_CONFIRMACAO',
  FINALIZADO: 'FINALIZADO',
  CANCELADO: 'CANCELADO',
};

function resposta(mensagem, extras = {}) {
  return { mensagem, acao: extras.acao || null, contexto: extras.contexto || null, meta: extras.meta || null };
}

function getFaltantes(estado) {
  const faltantes = [];
  if (!estado.tipoManutencao) faltantes.push('tipoManutencao');
  if (!estado.data) faltantes.push('data');
  if (!estado.horaInicio) faltantes.push('horaInicio');
  if (!estado.horaFim) faltantes.push('horaFim');
  return faltantes;
}

function proximaPergunta(faltantes) {
  if (faltantes.includes('tipoManutencao')) return 'Qual o tipo de manutenção? (**Preventiva** ou **Corretiva**)';
  if (faltantes.includes('data')) return 'Para qual data devo agendar? (DD/MM/AAAA)';
  if (faltantes.includes('horaInicio')) return 'Qual o horário de início? (HH:mm)';
  if (faltantes.includes('horaFim')) return 'Qual o horário de término? (HH:mm)';
  return null;
}

function buildResumoLote(estado) {
  const equips = estado.equipamentos || [];
  const linhas = equips.slice(0, 10).map(
    (e, i) =>
      `${i + 1}. **${e.modelo}** (TAG: ${e.tag || '-'}) — ${e.unidade?.nomeSistema || '-'} / ${e.setor || '-'}`
  );
  if (equips.length > 10) linhas.push(`_...e mais ${equips.length - 10} equipamento(s)_`);

  return [
    `Recomendo **${equips.length} Ordem(ns) de Serviço** do tipo **${estado.tipoManutencao}**:`,
    '',
    linhas.join('\n'),
    '',
    `📅 Data: **${estado.data}** | ⏰ **${estado.horaInicio}** às **${estado.horaFim}**`,
    '',
    'Clique em **Abrir agendamento em lote** para revisar e salvar, ou em **Cancelar** para descartar.',
  ].join('\n');
}

async function salvar(sessaoId, step, estado, msgAgente) {
  await AgentSessionRepository.salvarSessao(sessaoId, { step, state: estado });
  await AgentSessionRepository.registrarMensagem(sessaoId, 'agent', msgAgente, { step });
}

export const BatchAgendamentoService = {
  async processar(mensagem, contextoUsuario, sessaoExistente = null, _acaoContextual = null, subtarefas = null) {
    const { usuarioId, tenantId } = contextoUsuario;
    const sessionKey = getSessionKey(usuarioId, tenantId);

    let sessao = sessaoExistente;

    if (!sessao) {
      const stateInicial = {
        step: BATCH_STEPS.START,
        equipamentos: subtarefas?.equipamentos || [],
        total: subtarefas?.total || 0,
        filtro: subtarefas?.filtro || null,
        tipoManutencao: subtarefas?.tipoManutencao || null,
        data: subtarefas?.data || null,
        horaInicio: subtarefas?.horaInicio || null,
        horaFim: subtarefas?.horaFim || null,
      };

      sessao = await AgentSessionRepository.criarSessao({
        usuario: sessionKey,
        tenantId,
        intent: 'BATCH_AGENDAMENTO',
        step: BATCH_STEPS.START,
        state: stateInicial,
      });
    }

    await AgentSessionRepository.registrarMensagem(sessao.id, 'user', mensagem);

    let estado = JSON.parse(sessao.stateJson || '{}');
    if (!estado.step) estado.step = BATCH_STEPS.START;

    const msgNorm = mensagem.toLowerCase().trim();
    const ehConfirmacao = ['sim', 'confirmar', 'ok', 'pode', 'pode sim'].includes(msgNorm);
    const ehCancelamento = ['não', 'nao', 'cancelar', 'cancela', 'parar', 'negativo'].includes(msgNorm);

    if (ehCancelamento) {
      await AgentSessionRepository.cancelarSessao(sessao.id);
      return resposta('Cancelado. Como posso ajudar com outra coisa?');
    }

    if (!estado.equipamentos || estado.equipamentos.length === 0) {
      await AgentSessionRepository.cancelarSessao(sessao.id);
      return resposta('Não encontrei equipamentos para esse critério. Pode descrever melhor quais equipamentos deseja agendar?');
    }

    // Extrai campos da mensagem (data, hora, tipo)
    const extraido = await extrairCamposComIA(mensagem, estado);
    estado = mergeEstadoAgente(estado, extraido);

    const faltantes = getFaltantes(estado);

    // Confirmação com dados completos — gera lista de recomendações (não persiste)
    if (ehConfirmacao && faltantes.length === 0) {
      const recomendacoes = [];
      const invalidas = [];

      for (const equipamento of estado.equipamentos) {
        const estadoEquip = {
          ...estado,
          equipamentoId: equipamento.id,
          modelo: equipamento.modelo,
          tag: equipamento.tag || null,
          unidadeId: equipamento.unidade?.id || null,
          unidadeNome: equipamento.unidade?.nomeSistema || null,
        };

        try {
          const recomendacao = montarRecomendacaoManutencao(estadoEquip);
          recomendacoes.push(recomendacao);
        } catch (err) {
          invalidas.push({ modelo: equipamento.modelo, erro: err.message });
          console.error(`[BATCH_AGENDAMENTO] Recomendação inválida para ${equipamento.modelo}:`, err.message);
        }
      }

      await AgentSessionRepository.finalizarSessao(sessao.id);

      let msg;
      if (recomendacoes.length > 0 && invalidas.length === 0) {
        msg = `✨ **${recomendacoes.length} recomendação(ões) pronta(s).** Clique em **Abrir agendamento em lote** para revisar e salvar.`;
      } else if (recomendacoes.length > 0) {
        msg = `✨ **${recomendacoes.length} recomendação(ões) pronta(s).** ⚠️ ${invalidas.length} equipamento(s) sem dados suficientes: ${invalidas.map((e) => e.modelo).join(', ')}.`;
      } else {
        msg = `❌ Não consegui montar recomendações válidas. Verifique se os equipamentos possuem todos os dados necessários.`;
      }

      const meta = {
        step: BATCH_STEPS.FINALIZADO,
        reason: 'BATCH_RECOMMENDATION_READY',
        recomendacoes,
        invalidas,
        actions:
          recomendacoes.length > 0
            ? [
                { id: 'abrir_agendamento_lote', label: 'Abrir agendamento em lote', variant: 'primary' },
                { id: 'cancelar', label: 'Cancelar', variant: 'secondary' },
              ]
            : [{ id: 'cancelar', label: 'Cancelar', variant: 'secondary' }],
      };

      await AgentSessionRepository.registrarMensagem(sessao.id, 'agent', msg, meta);
      return resposta(msg, { meta });
    }

    // Dados completos mas sem confirmação — pede confirmação
    if (faltantes.length === 0) {
      estado.step = BATCH_STEPS.AGUARDANDO_CONFIRMACAO;
      const resumo = buildResumoLote(estado);
      await salvar(sessao.id, estado.step, estado, resumo);
      return resposta(resumo, { meta: { step: estado.step } });
    }

    // Ainda faltam dados — coleta
    const isFirstTime = estado.step === BATCH_STEPS.START;
    estado.step = BATCH_STEPS.COLETANDO_DADOS;

    let msg;
    if (isFirstTime) {
      const nomes = estado.equipamentos.slice(0, 5).map((e) => `**${e.modelo}**`).join(', ');
      const sufixo = estado.equipamentos.length > 5 ? ` e mais ${estado.equipamentos.length - 5}` : '';
      msg = `Encontrei **${estado.equipamentos.length}** equipamento(s): ${nomes}${sufixo}.\n\n${proximaPergunta(faltantes)}`;
    } else {
      msg = proximaPergunta(faltantes) || 'Preciso de mais informações para continuar.';
    }

    await salvar(sessao.id, estado.step, estado, msg);
    return resposta(msg, { meta: { step: estado.step, faltantes } });
  },
};
