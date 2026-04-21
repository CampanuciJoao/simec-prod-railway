import { criarManutencaoService } from '../../manutencao/index.js';
import {
  MANUTENCAO_FIELD_LABELS,
  validarManutencaoPayload,
} from '../../../validators/manutencaoValidator.js';

function normalizarTipoManutencao(tipoManutencao) {
  const tipo = (tipoManutencao || '').toString().trim().toLowerCase();

  if (tipo === 'preventiva') return 'Preventiva';
  if (tipo === 'corretiva') return 'Corretiva';
  if (tipo === 'calibracao' || tipo === 'calibração') return 'Calibracao';
  if (tipo === 'inspecao' || tipo === 'inspeção') return 'Inspecao';

  return null;
}

function montarDescricaoFinal(tipoManutencao, estado) {
  if (estado?.descricaoProblemaServico?.trim()) {
    return estado.descricaoProblemaServico.trim();
  }

  if (estado?.descricao?.trim()) {
    return estado.descricao.trim();
  }

  if (tipoManutencao === 'Corretiva') {
    return '';
  }

  return 'Manutenção preventiva de rotina';
}

export function montarPayloadManutencaoDoAgente(estado) {
  const tipo = normalizarTipoManutencao(estado?.tipoManutencao);

  return {
    equipamentoId: estado?.equipamentoId || '',
    tipo: tipo || '',
    descricaoProblemaServico: montarDescricaoFinal(tipo, estado),
    tecnicoResponsavel: estado?.tecnicoResponsavel?.trim() || null,
    numeroChamado: estado?.numeroChamado?.trim() || null,
    agendamentoDataInicioLocal: estado?.data || '',
    agendamentoHoraInicioLocal: estado?.horaInicio || '',
    agendamentoDataFimLocal: estado?.data || '',
    agendamentoHoraFimLocal: estado?.horaFim || '',
    status: 'Agendada',
  };
}

export function validarPayloadAgendamentoDoAgente(estado) {
  const payload = montarPayloadManutencaoDoAgente(estado);
  const validacao = validarManutencaoPayload(payload);

  return {
    payload,
    validacao,
    labels: MANUTENCAO_FIELD_LABELS,
  };
}

export async function criarManutencaoNoBanco(estado, contextoUsuario) {
  const { tenantId, usuarioId } = contextoUsuario || {};

  if (!tenantId || !usuarioId) {
    throw new Error('CONTEXTO_USUARIO_INVALIDO_PARA_CRIAR_MANUTENCAO');
  }

  const { payload, validacao } = validarPayloadAgendamentoDoAgente(estado);

  if (!validacao.ok) {
    const error = new Error(validacao.message || 'Dados inválidos para criação da manutenção.');
    error.code = 'AGENT_VALIDATION_ERROR';
    error.details = validacao;
    throw error;
  }

  const resultado = await criarManutencaoService({
    tenantId,
    usuarioId,
    dados: payload,
  });

  if (!resultado.ok) {
    const error = new Error(resultado.message || 'Falha ao criar manutenção pelo agente.');
    error.code = 'MANUTENCAO_SERVICE_ERROR';
    error.details = resultado;
    throw error;
  }

  return resultado.data;
}
