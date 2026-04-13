// Ficheiro: services/agent/agendamento/agendamentoService.js
// Versão: Multi-tenant ready + modularizado + compatível com router contextual

import { AgentSessionRepository } from '../session/agentSessionRepository.js';
import { UserAgentMemoryRepository } from '../session/userAgentMemoryRepository.js';
import { extrairCamposComIA } from './extractor/index.js';
import { mergeEstadoAgente } from './state/mergeEstadoAgente.js';
import { getFaltantes } from './state/faltantes.js';
import { proximaPergunta } from './ui/perguntas.js';
import { buildResumoConfirmacao } from './ui/resumoBuilder.js';
import { validarHorarioFuturo } from './validators/horarioValidator.js';
import { resolverEntidades } from '../shared/entityResolver.js';
import { criarManutencaoNoBanco } from '../workflow/dbManager.js';
import { validarConflitoAgenda } from '../workflow/agendaValidator.js';
import {
  STEPS,
  inicializarStep,
  determinarProximoStep,
  resetarConfirmacaoSeHouverMudanca,
} from '../workflow/stateMachine.js';
import { getSessionKey } from '../core/sessionKeys.js';

function respostaPadrao(mensagem, extras = {}) {
  return {
    mensagem,
    acao: extras.acao || null,
    contexto: extras.contexto || null,
    meta: extras.meta || null,
  };
}

function mensagemEhConfirmacaoPositiva(msg) {
  return ['sim', 'confirmar', 'ok', 'pode', 'pode sim'].includes(msg);
}

function mensagemEhConfirmacaoNegativa(msg) {
  return ['não', 'nao', 'cancelar', 'cancela', 'parar', 'negativo'].includes(
    msg
  );
}

function detectarSeHouveCorrecao(extraido) {
  return (
    !!extraido.tipoManutencao ||
    !!extraido.unidadeTexto ||
    !!extraido.equipamentoTexto ||
    !!extraido.data ||
    !!extraido.horaInicio ||
    !!extraido.horaFim ||
    !!extraido.numeroChamado ||
    !!extraido.descricao
  );
}

async function salvarERegistrarMensagemAgente(
  sessaoId,
  step,
  state,
  mensagem,
  meta = {},
  resumo = null
) {
  await AgentSessionRepository.salvarSessao(sessaoId, {
    step,
    state,
    resumo,
  });

  await AgentSessionRepository.registrarMensagem(sessaoId, 'agent', mensagem, {
    step,
    ...meta,
  });
}

export const AgendamentoService = {
  async processar(
    mensagem,
    contextoUsuario,
    sessaoExistente = null,
    acaoContextual = null
  ) {
    const { usuarioId, tenantId } = contextoUsuario;
    const sessionKey = getSessionKey(usuarioId, tenantId);

    let sessao = sessaoExistente;

    if (!sessao) {
      sessao = await AgentSessionRepository.criarSessao({
        usuario: sessionKey,
        tenantId,
        intent: 'AGENDAR_MANUTENCAO',
        step: STEPS.START,
        state: {},
      });
    }

    let estado = JSON.parse(sessao.stateJson || '{}');
    estado = inicializarStep(estado);

    await AgentSessionRepository.registrarMensagem(sessao.id, 'user', mensagem);

    const extraido = await extrairCamposComIA(mensagem, estado);
    const msgNormalizada = mensagem.toLowerCase().trim();

    // Compatibilidade com ações contextuais do router
    if (acaoContextual?.matched) {
      if (acaoContextual.action === 'CONFIRMAR' || acaoContextual.action === 'SIM') {
        extraido.confirmacao = true;
      }

      if (
        acaoContextual.action === 'CANCELAR_ACAO' ||
        acaoContextual.action === 'NAO' ||
        acaoContextual.action === 'CANCELAR'
      ) {
        extraido.confirmacao = false;
      }
    }

    if (mensagemEhConfirmacaoPositiva(msgNormalizada)) {
      extraido.confirmacao = true;
    }

    if (mensagemEhConfirmacaoNegativa(msgNormalizada)) {
      extraido.confirmacao = false;
    }

    estado = mergeEstadoAgente(estado, extraido);

    const houveCorrecao = detectarSeHouveCorrecao(extraido);
    estado = resetarConfirmacaoSeHouverMudanca(estado, houveCorrecao);

    if (extraido.confirmacao === false && !houveCorrecao) {
      estado.step = STEPS.CANCELADO;

      const resposta = respostaPadrao(
        'Entendido. Cancelei o agendamento. Como posso ajudar com outra coisa?'
      );

      await salvarERegistrarMensagemAgente(
        sessao.id,
        estado.step,
        estado,
        resposta.mensagem,
        { acao: 'CANCELAMENTO' },
        null
      );

      await AgentSessionRepository.cancelarSessao(sessao.id);

      return resposta;
    }

    estado = await resolverEntidades(estado, tenantId);

    if (estado.ambiguidadeEquipamento?.length > 0) {
      estado.step = STEPS.COLETANDO_DADOS;

      const mensagemResposta = `Encontrei mais de um equipamento compatível. Qual deles você deseja? ${estado.ambiguidadeEquipamento
        .map(
          (e) =>
            `**${e.modelo}** (TAG: ${e.tag})${
              e.tipoEquipamento ? ` - ${e.tipoEquipamento}` : ''
            }`
        )
        .join(', ')}`;

      await salvarERegistrarMensagemAgente(
        sessao.id,
        estado.step,
        estado,
        mensagemResposta,
        {
          tipo: 'AMBIGUIDADE_EQUIPAMENTO',
          ambiguidadeEquipamento: estado.ambiguidadeEquipamento,
        }
      );

      return respostaPadrao(mensagemResposta, {
        meta: {
          step: estado.step,
          ambiguidadeEquipamento: estado.ambiguidadeEquipamento,
        },
      });
    }

    const validacaoHorario = validarHorarioFuturo(
      estado.data,
      estado.horaInicio
    );

    if (!validacaoHorario.valido) {
      estado.horaInicio = null;
      estado.horaFim = null;
      estado.aguardandoConfirmacao = false;
      estado.confirmacao = null;
      estado.step = STEPS.COLETANDO_DADOS;

      await salvarERegistrarMensagemAgente(
        sessao.id,
        estado.step,
        estado,
        validacaoHorario.msg,
        { tipo: 'HORARIO_INVALIDO' }
      );

      return respostaPadrao(validacaoHorario.msg, {
        meta: {
          step: estado.step,
          tipo: 'HORARIO_INVALIDO',
        },
      });
    }

    const faltantes = getFaltantes(estado);

    let conflitoAgenda = null;
    if (faltantes.length === 0) {
      conflitoAgenda = await validarConflitoAgenda(estado, tenantId);
    }

    const proximoStep = determinarProximoStep({
      estado,
      faltantes,
      conflitoAgenda,
      confirmacao: extraido.confirmacao,
      houveCorrecao,
    });

    estado.step = proximoStep;

    if (proximoStep === STEPS.COLETANDO_DADOS) {
      let mensagemResposta;

      if (conflitoAgenda && !conflitoAgenda.valido) {
        estado.aguardandoConfirmacao = false;
        estado.confirmacao = null;
        mensagemResposta = `${conflitoAgenda.mensagem} Por favor, informe outro horário.`;
      } else {
        const houveNovosDados = Object.values(extraido).some(
          (v) => v !== null && v !== undefined
        );
        const prefixo = houveNovosDados ? 'Legal, anotei.' : 'Entendi.';
        mensagemResposta = `${prefixo} ${proximaPergunta(estado, faltantes)}`;
      }

      await salvarERegistrarMensagemAgente(
        sessao.id,
        estado.step,
        estado,
        mensagemResposta,
        { faltantes }
      );

      return respostaPadrao(mensagemResposta, {
        meta: {
          step: estado.step,
          faltantes,
        },
      });
    }

    if (proximoStep === STEPS.AGUARDANDO_CONFIRMACAO) {
      let mensagemResposta;

      if (!estado.aguardandoConfirmacao) {
        estado.aguardandoConfirmacao = true;
        mensagemResposta = buildResumoConfirmacao(estado);
      } else {
        mensagemResposta =
          'Para finalizar, você confirma os dados do resumo acima? Responda com **Sim** ou **Não**.';
      }

      await salvarERegistrarMensagemAgente(
        sessao.id,
        estado.step,
        estado,
        mensagemResposta,
        { aguardandoConfirmacao: true },
        mensagemResposta
      );

      return respostaPadrao(mensagemResposta, {
        meta: {
          step: estado.step,
          aguardandoConfirmacao: true,
        },
      });
    }

    if (proximoStep === STEPS.FINALIZADO) {
      try {
        const revalidacao = await validarConflitoAgenda(estado, tenantId);

        if (!revalidacao.valido) {
          estado.step = STEPS.COLETANDO_DADOS;
          estado.aguardandoConfirmacao = false;
          estado.confirmacao = null;

          const mensagemResposta = `${revalidacao.mensagem} O horário ficou indisponível antes da confirmação. Por favor, informe outro horário.`;

          await salvarERegistrarMensagemAgente(
            sessao.id,
            estado.step,
            estado,
            mensagemResposta,
            { tipo: 'REVALIDACAO_CONFLITO' }
          );

          return respostaPadrao(mensagemResposta, {
            meta: {
              step: estado.step,
              tipo: 'REVALIDACAO_CONFLITO',
            },
          });
        }

        const manutencao = await criarManutencaoNoBanco(estado, tenantId);

        await UserAgentMemoryRepository.upsertMemoria(sessionKey, {
          tenantId,
          usuario: sessionKey,
          ultimaUnidadeId: estado.unidadeId || null,
          ultimaUnidadeNome: estado.unidadeNome || null,
          ultimoEquipamentoId: estado.equipamentoId || null,
          ultimoEquipamentoTag: estado.tag || null,
          ultimoEquipamentoModelo:
            estado.equipamentoNome || estado.modelo || null,
        });

        const mensagemResposta =
          '✅ **Perfeito! Agendamento realizado com sucesso.** A Ordem de Serviço foi gerada e o ativo atualizado no sistema.';

        const stateFinal = {
          ...estado,
          manutencaoId: manutencao.id,
          numeroOS: manutencao.numeroOS,
        };

        await AgentSessionRepository.salvarSessao(sessao.id, {
          step: STEPS.FINALIZADO,
          state: stateFinal,
          resumo: mensagemResposta,
        });

        await AgentSessionRepository.registrarMensagem(
          sessao.id,
          'agent',
          mensagemResposta,
          {
            step: STEPS.FINALIZADO,
            manutencaoId: manutencao.id,
            numeroOS: manutencao.numeroOS,
          }
        );

        await AgentSessionRepository.finalizarSessao(sessao.id);

        return respostaPadrao(mensagemResposta, {
          meta: {
            step: STEPS.FINALIZADO,
            manutencaoId: manutencao.id,
            numeroOS: manutencao.numeroOS,
          },
        });
      } catch (error) {
        console.error('[AGENDAMENTO_DB_ERROR]', error);

        const mensagemResposta =
          'Tive um erro técnico ao salvar no banco. Por favor, tente confirmar novamente ou contate o suporte.';

        await AgentSessionRepository.registrarMensagem(
          sessao.id,
          'agent',
          mensagemResposta,
          {
            step: estado.step,
            tipo: 'ERRO_BANCO',
          }
        );

        return respostaPadrao(mensagemResposta, {
          meta: {
            step: estado.step,
            tipo: 'ERRO_BANCO',
          },
        });
      }
    }

    const fallback =
      'Tive dificuldade para continuar o fluxo do agendamento. Pode repetir a última informação?';

    await salvarERegistrarMensagemAgente(
      sessao.id,
      estado.step,
      estado,
      fallback,
      { tipo: 'FALLBACK' },
      fallback
    );

    return respostaPadrao(fallback, {
      meta: {
        step: estado.step,
        tipo: 'FALLBACK',
      },
    });
  },
};