import { AgentSessionRepository } from '../session/agentSessionRepository.js';
import { resolverEntidades } from '../shared/entityResolver.js';
import { extrairCamposOsCorretiva } from './extractor/osCorretivaExtractor.js';
import {
  STEPS_OS,
  inicializarStepOs,
  mergeEstadoOs,
  getFaltantesAbrirOs,
  getFaltantesAgendarVisita,
  temDataHora,
  sinalizaNovaOcorrencia,
} from './state/osCorretivaState.js';
import {
  proximaPerguntaOs,
  formatarListaOsAbertas,
} from './ui/osCorretivaPerguntas.js';
import { buildResumoAbrirOs, buildResumoAgendarVisita } from './ui/osCorretivaResumo.js';
import { getSessionKey } from '../core/sessionKeys.js';
import { listarOsAbertasPorEquipamento } from '../../osCorretiva/osCorretivaRepository.js';
import {
  abrirOsCorretivaService,
  agendarVisitaTerceiroService,
} from '../../osCorretiva/index.js';
import { buildUtcIntervalFromLocal, resolveOperationalTimezone } from '../../time/index.js';
import prisma from '../../prismaService.js';

function resposta(mensagem, meta = {}) {
  return { mensagem, acao: meta.acao || null, contexto: meta.contexto || null, meta: meta.meta || null };
}

function normalizarSelecaoStatus(msg) {
  const m = msg.toLowerCase().trim();
  if (m === '1' || /inoper/.test(m)) return 'Inoperante';
  if (m === '2' || /limitad|parcial/.test(m)) return 'UsoLimitado';
  if (m === '3' || /manut|revis/.test(m)) return 'EmManutencao';
  // "Operante" também é válido: ocorrência intermitente, equipamento voltou
  // ao normal e a OS abre só para acompanhar / fechar internamente depois.
  if (m === '4' || /\bopera/.test(m) || /\bnormal\b/.test(m) || /observ/.test(m)) return 'Operante';
  return null;
}

async function resolverTimezoneDoEquipamento(tenantId, equipamentoId) {
  const equip = await prisma.equipamento.findFirst({
    where: { tenantId, id: equipamentoId },
    select: { unidade: { select: { timezone: true } } },
  });
  const tenant = await prisma.tenant.findFirst({ where: { id: tenantId }, select: { timezone: true } });
  return resolveOperationalTimezone({
    tenantTimezone: tenant?.timezone,
    unidadeTimezone: equip?.unidade?.timezone,
  });
}

async function salvarERegistrar(sessaoId, step, state, mensagem, meta = {}) {
  await AgentSessionRepository.salvarSessao(sessaoId, { step, state });
  await AgentSessionRepository.registrarMensagem(sessaoId, 'agent', mensagem, { step, ...meta });
}

function construirMensagemResolucaoEntidade(estado) {
  const unidade = estado.entityResolution?.unidade;
  const equipamento = estado.entityResolution?.equipamento;

  if (unidade?.status === 'not_found') {
    const sugestoes = unidade.suggestions?.slice(0, 3).map((s) => `**${s.label}**`).join(', ');
    return sugestoes
      ? `Não encontrei a unidade informada. Você quis dizer ${sugestoes}?`
      : 'Não encontrei a unidade informada. Pode escrever o nome como está no cadastro?';
  }
  if (unidade?.status === 'low_confidence') {
    return `Encontrei uma unidade parecida: **${unidade.matches[0]?.label}**. Confirma que é essa?`;
  }
  if (equipamento?.status === 'not_found') {
    const sugestoes = equipamento.suggestions?.slice(0, 3).map((s) => `**${s.label}**`).join(', ');
    return sugestoes
      ? `Não encontrei esse equipamento. Você quis dizer ${sugestoes}?`
      : 'Não encontrei o equipamento informado. Pode escrever o modelo ou TAG como está no cadastro?';
  }
  if (equipamento?.status === 'low_confidence') {
    const match = equipamento.matches[0];
    return `Encontrei um equipamento parecido: **${match?.label}**${match?.secondary ? ` (${match.secondary})` : ''}. Confirma que é esse?`;
  }
  if (estado.ambiguidadeEquipamento?.length > 0) {
    const lista = estado.ambiguidadeEquipamento
      .slice(0, 4)
      .map((e) => `**${e.modelo}** (TAG: ${e.tag || '—'}${e.unidade ? ` — ${e.unidade}` : ''})`)
      .join(', ');
    return `Encontrei mais de um equipamento compatível. Qual deles? ${lista}`;
  }
  return null;
}

function aplicarConfirmacaoDeResolucao(estado, confirmacao) {
  if (confirmacao !== true) return estado;
  const novo = { ...estado };
  const unidade = novo.entityResolution?.unidade;
  const equipamento = novo.entityResolution?.equipamento;

  if (unidade?.status === 'low_confidence' && unidade.matches?.[0]) {
    novo.unidadeId = unidade.matches[0].id;
    novo.unidadeNome = unidade.matches[0].label;
    novo.entityResolution.unidade = { ...unidade, status: 'resolved', reason: null };
  }
  if (equipamento?.status === 'low_confidence' && equipamento.matches?.[0]) {
    novo.equipamentoId = equipamento.matches[0].id;
    novo.equipamentoNome = equipamento.matches[0].modelo || equipamento.matches[0].label;
    novo.tag = equipamento.matches[0].tag || null;
    if (!novo.unidadeNome && equipamento.matches[0].unidade) novo.unidadeNome = equipamento.matches[0].unidade;
    novo.entityResolution.equipamento = { ...equipamento, status: 'resolved', reason: null };
  }
  return novo;
}

export const OsCorretivaAgentService = {
  async processar(mensagem, contextoUsuario, sessaoExistente = null, acaoContextual = null) {
    const { usuarioId, usuarioNome, tenantId, tenantTimezone = 'UTC' } = contextoUsuario;
    const sessionKey = getSessionKey(usuarioId, tenantId);

    let sessao = sessaoExistente;
    if (!sessao) {
      sessao = await AgentSessionRepository.criarSessao({
        usuario: sessionKey,
        tenantId,
        intent: 'OS_CORRETIVA',
        step: STEPS_OS.START,
        state: {},
      });
    }

    let estado = JSON.parse(sessao.stateJson || '{}');
    estado = inicializarStepOs(estado);

    await AgentSessionRepository.registrarMensagem(sessao.id, 'user', mensagem);

    const extraido = await extrairCamposOsCorretiva(mensagem, estado);

    // Ação contextual (SIM/NÃO via botão do frontend)
    if (acaoContextual?.matched) {
      if (['CONFIRMAR', 'SIM'].includes(acaoContextual.action)) extraido.confirmacao = true;
      if (['CANCELAR', 'CANCELAR_ACAO', 'NAO'].includes(acaoContextual.action)) extraido.confirmacao = false;
    }

    // Cancelamento global
    if (extraido.confirmacao === false && estado.step !== STEPS_OS.SELECIONANDO_ACAO && !temAlteracao(extraido, estado)) {
      estado.step = STEPS_OS.CANCELADO;
      const msg = 'Entendido. Cancelei a operação. Como posso ajudar?';
      await salvarERegistrar(sessao.id, estado.step, estado, msg);
      await AgentSessionRepository.cancelarSessao(sessao.id);
      return resposta(msg);
    }

    // ─── Merge de estado ──────────────────────────────────────────────────────
    estado = mergeEstadoOs(estado, extraido);

    // Confirmação de entidade low_confidence
    estado = aplicarConfirmacaoDeResolucao(estado, extraido.confirmacao);

    // Reset confirmação se houve alteração
    if (temAlteracao(extraido, estado) && estado.aguardandoConfirmacao) {
      estado.aguardandoConfirmacao = false;
    }

    // ─── Resolução de entidade ────────────────────────────────────────────────
    if ((estado.equipamentoTexto || estado.unidadeTexto) && !estado.equipamentoId) {
      estado = await resolverEntidades(estado, tenantId);
    }

    const problemaEntidade = construirMensagemResolucaoEntidade(estado);
    if (problemaEntidade && !estado.equipamentoId) {
      estado.step = STEPS_OS.COLETANDO_DADOS;
      await salvarERegistrar(sessao.id, estado.step, estado, problemaEntidade);
      return resposta(problemaEntidade);
    }

    // ─── START — roteamento inicial ───────────────────────────────────────────
    if (estado.step === STEPS_OS.START && estado.equipamentoId) {
      const osesAbertas = await listarOsAbertasPorEquipamento({ tenantId, equipamentoId: estado.equipamentoId });

      if (osesAbertas.length === 0 || sinalizaNovaOcorrencia(extraido, mensagem)) {
        estado.fluxo = 'ABRIR_OS';
        estado.solicitante = usuarioNome;
        estado.step = STEPS_OS.COLETANDO_DADOS;
      } else if (temDataHora(extraido) || estado.data) {
        estado.fluxo = 'AGENDAR_VISITA';
        if (osesAbertas.length === 1) {
          estado.osId = osesAbertas[0].id;
          estado.osNumero = osesAbertas[0].numeroOS;
          estado.osDescricao = osesAbertas[0].descricaoProblema;
          estado.step = STEPS_OS.COLETANDO_DADOS;
        } else {
          estado.osesAbertas = osesAbertas;
          estado.step = STEPS_OS.SELECIONANDO_OS;
          const lista = formatarListaOsAbertas(osesAbertas);
          const msg = `Encontrei **${osesAbertas.length} OS abertas** para esse equipamento:\n\n${lista}\n\nPara qual deseja agendar a visita?`;
          await salvarERegistrar(sessao.id, estado.step, estado, msg);
          return resposta(msg);
        }
      } else {
        // OS(es) existem, mas sem data — perguntar intenção
        estado.step = STEPS_OS.SELECIONANDO_ACAO;
        const lista = formatarListaOsAbertas(osesAbertas);
        const msg = osesAbertas.length === 1
          ? `Já existe uma OS aberta para esse equipamento:\n\n${lista}\n\nDeseja **agendar uma visita** para essa OS ou **registrar uma nova ocorrência** para um problema diferente?`
          : `Já existem **${osesAbertas.length} OS abertas** para esse equipamento:\n\n${lista}\n\nDeseja **agendar uma visita** para alguma delas ou **registrar uma nova ocorrência** para um problema diferente?`;
        await salvarERegistrar(sessao.id, estado.step, estado, msg);
        return resposta(msg);
      }
    }

    // ─── SELECIONANDO_ACAO ────────────────────────────────────────────────────
    if (estado.step === STEPS_OS.SELECIONANDO_ACAO) {
      const m = mensagem.toLowerCase();
      const querVisita = /visita|agendar|terceiro|prestador|técnico|tecnico/.test(m);
      const querNova = sinalizaNovaOcorrencia(extraido, mensagem);

      if (querNova) {
        estado.fluxo = 'ABRIR_OS';
        estado.solicitante = usuarioNome;
        estado.step = STEPS_OS.COLETANDO_DADOS;
      } else if (querVisita) {
        estado.fluxo = 'AGENDAR_VISITA';
        const osesAbertas = estado.osesAbertas || await listarOsAbertasPorEquipamento({ tenantId, equipamentoId: estado.equipamentoId });
        if (osesAbertas.length === 1) {
          estado.osId = osesAbertas[0].id;
          estado.osNumero = osesAbertas[0].numeroOS;
          estado.osDescricao = osesAbertas[0].descricaoProblema;
          estado.step = STEPS_OS.COLETANDO_DADOS;
        } else {
          estado.osesAbertas = osesAbertas;
          estado.step = STEPS_OS.SELECIONANDO_OS;
          const lista = formatarListaOsAbertas(osesAbertas);
          const msg = `Para qual OS deseja agendar a visita?\n\n${lista}`;
          await salvarERegistrar(sessao.id, estado.step, estado, msg);
          return resposta(msg);
        }
      } else {
        const msg = 'Por favor, indique se deseja **agendar uma visita** para uma OS existente ou **registrar uma nova ocorrência**.';
        await salvarERegistrar(sessao.id, estado.step, estado, msg);
        return resposta(msg);
      }
    }

    // ─── SELECIONANDO_OS ──────────────────────────────────────────────────────
    if (estado.step === STEPS_OS.SELECIONANDO_OS) {
      const idx = extraido.osIndex;
      const osesAbertas = estado.osesAbertas || [];
      const osSelecionada = idx && osesAbertas[idx - 1] ? osesAbertas[idx - 1] : null;

      if (!osSelecionada) {
        const lista = formatarListaOsAbertas(osesAbertas);
        const msg = `Não identificei qual OS você escolheu. Por favor, indique o número:\n\n${lista}`;
        await salvarERegistrar(sessao.id, estado.step, estado, msg);
        return resposta(msg);
      }

      estado.osId = osSelecionada.id;
      estado.osNumero = osSelecionada.numeroOS;
      estado.osDescricao = osSelecionada.descricaoProblema;
      estado.step = STEPS_OS.COLETANDO_DADOS;
    }

    // ─── COLETANDO_DADOS ──────────────────────────────────────────────────────
    if (estado.step === STEPS_OS.COLETANDO_DADOS || estado.step === STEPS_OS.START) {
      if (!estado.fluxo) {
        estado.fluxo = 'ABRIR_OS';
        estado.solicitante = usuarioNome;
      }

      // Seleção de status via número/texto
      if (!estado.statusEquipamentoAbertura && estado.fluxo === 'ABRIR_OS') {
        const statusSelecionado = normalizarSelecaoStatus(mensagem);
        if (statusSelecionado) estado.statusEquipamentoAbertura = statusSelecionado;
      }

      const faltantes = estado.fluxo === 'ABRIR_OS'
        ? getFaltantesAbrirOs(estado)
        : getFaltantesAgendarVisita(estado);

      if (faltantes.length > 0) {
        estado.step = STEPS_OS.COLETANDO_DADOS;

        // Entidade sem texto ainda
        if (faltantes[0] === 'equipamentoId' && !estado.equipamentoTexto) {
          const msg = proximaPerguntaOs(estado.fluxo, faltantes);
          await salvarERegistrar(sessao.id, estado.step, estado, msg);
          return resposta(msg);
        }

        const msg = `${proximaPerguntaOs(estado.fluxo, faltantes)}`;
        await salvarERegistrar(sessao.id, estado.step, estado, msg);
        return resposta(msg);
      }

      // Tudo preenchido → vai para confirmação
      estado.step = STEPS_OS.AGUARDANDO_CONFIRMACAO;
      estado.aguardandoConfirmacao = true;
    }

    // ─── AGUARDANDO_CONFIRMACAO ───────────────────────────────────────────────
    if (estado.step === STEPS_OS.AGUARDANDO_CONFIRMACAO) {
      if (extraido.confirmacao !== true) {
        const resumo = estado.fluxo === 'ABRIR_OS'
          ? buildResumoAbrirOs(estado)
          : buildResumoAgendarVisita(estado);
        await salvarERegistrar(sessao.id, estado.step, estado, resumo);
        return resposta(resumo);
      }

      // Confirmar → executar
      if (estado.fluxo === 'ABRIR_OS') {
        const resultado = await abrirOsCorretivaService({
          tenantId,
          usuarioId,
          dados: {
            equipamentoId: estado.equipamentoId,
            solicitante: estado.solicitante,
            descricaoProblema: estado.descricaoProblema,
            statusEquipamentoAbertura: estado.statusEquipamentoAbertura,
          },
        });

        if (!resultado.ok) {
          const msg = resultado.message || 'Não foi possível registrar a ocorrência. Por favor, tente novamente.';
          await salvarERegistrar(sessao.id, estado.step, estado, msg);
          return resposta(msg);
        }

        const os = resultado.data;
        const msg = `✅ **Ocorrência registrada com sucesso!**\n📋 **OS:** ${os.numeroOS}\n🔧 **Equipamento:** ${estado.equipamentoNome || os.equipamento?.modelo || '—'}\n📝 **Problema:** ${estado.descricaoProblema}`;

        await AgentSessionRepository.salvarSessao(sessao.id, { step: STEPS_OS.FINALIZADO, state: { ...estado, osId: os.id, osNumero: os.numeroOS } });
        await AgentSessionRepository.registrarMensagem(sessao.id, 'agent', msg, { step: STEPS_OS.FINALIZADO, osId: os.id, numeroOS: os.numeroOS });
        await AgentSessionRepository.finalizarSessao(sessao.id);
        return resposta(msg);
      }

      if (estado.fluxo === 'AGENDAR_VISITA') {
        const timezone = await resolverTimezoneDoEquipamento(tenantId, estado.equipamentoId);
        const { startUtc, endUtc } = buildUtcIntervalFromLocal({
          dateLocal: estado.data,
          startTimeLocal: estado.horaInicio,
          endTimeLocal: estado.horaFim,
          timezone,
        });

        if (!startUtc || !endUtc) {
          const msg = 'Não consegui converter o horário informado. Por favor, informe a data e horários novamente.';
          estado.data = null; estado.horaInicio = null; estado.horaFim = null;
          estado.step = STEPS_OS.COLETANDO_DADOS;
          await salvarERegistrar(sessao.id, estado.step, estado, msg);
          return resposta(msg);
        }

        const resultado = await agendarVisitaTerceiroService({
          tenantId,
          usuarioId,
          osId: estado.osId,
          dados: {
            prestadorNome: estado.prestadorNome,
            dataHoraInicioPrevista: startUtc.toISOString(),
            dataHoraFimPrevista: endUtc.toISOString(),
          },
        });

        if (!resultado.ok) {
          let msg = resultado.message || 'Não foi possível agendar a visita.';
          if (resultado.status === 409) {
            // Conflito de agenda — limpa horário e volta para coleta
            estado.data = null; estado.horaInicio = null; estado.horaFim = null;
            estado.aguardandoConfirmacao = false;
            estado.step = STEPS_OS.COLETANDO_DADOS;
          }
          await salvarERegistrar(sessao.id, estado.step, estado, msg);
          return resposta(msg);
        }

        const dataFormatada = estado.data ? estado.data.split('-').reverse().join('/') : '—';
        const msg = `✅ **Visita agendada com sucesso!**\n📄 **OS:** ${estado.osNumero}\n🏢 **Prestador:** ${estado.prestadorNome}\n📅 **Data:** ${dataFormatada} das ${estado.horaInicio} às ${estado.horaFim}`;

        await AgentSessionRepository.salvarSessao(sessao.id, { step: STEPS_OS.FINALIZADO, state: estado });
        await AgentSessionRepository.registrarMensagem(sessao.id, 'agent', msg, { step: STEPS_OS.FINALIZADO });
        await AgentSessionRepository.finalizarSessao(sessao.id);
        return resposta(msg);
      }
    }

    const fallback = 'Não consegui continuar o fluxo. Pode repetir a última informação?';
    await salvarERegistrar(sessao.id, estado.step, estado, fallback);
    return resposta(fallback);
  },
};

function temAlteracao(extraido, estado) {
  return !!(
    (extraido.descricaoProblema && extraido.descricaoProblema !== estado.descricaoProblema) ||
    (extraido.statusEquipamentoAbertura && extraido.statusEquipamentoAbertura !== estado.statusEquipamentoAbertura) ||
    (extraido.prestadorNome && extraido.prestadorNome !== estado.prestadorNome) ||
    (extraido.data && extraido.data !== estado.data) ||
    (extraido.horaInicio && extraido.horaInicio !== estado.horaInicio) ||
    (extraido.horaFim && extraido.horaFim !== estado.horaFim)
  );
}
