import { AgentSessionRepository } from '../session/agentSessionRepository.js';
import { criarManutencaoNoBanco } from '../workflow/dbManager.js';
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
    `Vou criar **${equips.length} Ordem(ns) de Serviço** do tipo **${estado.tipoManutencao}**:`,
    '',
    linhas.join('\n'),
    '',
    `📅 Data: **${estado.data}** | ⏰ **${estado.horaInicio}** às **${estado.horaFim}**`,
    '',
    'Confirma a criação em lote? (**Sim** / **Não**)',
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

    // Confirmação com dados completos — criar OS em lote
    if (ehConfirmacao && faltantes.length === 0) {
      const criadas = [];
      const erros = [];

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
          const manutencao = await criarManutencaoNoBanco(estadoEquip, contextoUsuario);
          criadas.push({ modelo: equipamento.modelo, numeroOS: manutencao.numeroOS });
        } catch (err) {
          erros.push({ modelo: equipamento.modelo, erro: err.message });
          console.error(`[BATCH_AGENDAMENTO] Erro ao criar OS para ${equipamento.modelo}:`, err.message);
        }
      }

      await AgentSessionRepository.finalizarSessao(sessao.id);

      let msg;
      if (criadas.length > 0 && erros.length === 0) {
        const lista = criadas.slice(0, 5).map((r) => `- OS **${r.numeroOS}** — ${r.modelo}`).join('\n');
        const mais = criadas.length > 5 ? `\n_...e mais ${criadas.length - 5}_` : '';
        msg = `✅ **${criadas.length} Ordem(ns) de Serviço criada(s) com sucesso:**\n${lista}${mais}`;
      } else if (criadas.length > 0) {
        msg = `✅ **${criadas.length} OS criada(s)** com sucesso. ⚠️ **${erros.length} falha(s)**: ${erros.map((e) => e.modelo).join(', ')}.`;
      } else {
        msg = `❌ Não foi possível criar as OS. Verifique se os equipamentos possuem todos os dados necessários.`;
      }

      await AgentSessionRepository.registrarMensagem(sessao.id, 'agent', msg, {
        step: BATCH_STEPS.FINALIZADO,
        criadas: criadas.length,
        erros: erros.length,
      });
      return resposta(msg, { meta: { step: BATCH_STEPS.FINALIZADO, criadas: criadas.length, erros: erros.length } });
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
