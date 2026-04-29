import { buildAlertMetaManutencao } from './manutencaoAlertMeta.js';

import { normalizarParaExibicao as normalizarTexto } from '../../shared/textUtils.js';

function normalizarTipoManutencao(manut) {
  const tipo = String(manut?.tipo || 'manutencao').toLowerCase();
  return tipo.charAt(0).toUpperCase() + tipo.slice(1);
}

function normalizarEquipamento(manut) {
  return manut?.equipamento?.modelo || 'Equipamento';
}

function normalizarUnidade(manut) {
  return normalizarTexto(manut?.equipamento?.unidade?.nomeSistema);
}

function formatarJanelaTempo(minutos) {
  if (minutos === 60) return '1h';
  if (minutos === 1440) return '24h';
  return `${minutos} min`;
}

export function montarTituloProximidadeInicio(manut, minutos) {
  const tipo = normalizarTipoManutencao(manut);
  const equipamento = normalizarEquipamento(manut);
  const unidade = normalizarUnidade(manut);
  const janela = formatarJanelaTempo(minutos);
  return `Manutenção de ${tipo} no equipamento "${equipamento}" começa em ${janela} na unidade "${unidade}"`;
}

export function montarTituloInicio(manut) {
  const tipo = normalizarTipoManutencao(manut);
  const equipamento = normalizarEquipamento(manut);
  const unidade = normalizarUnidade(manut);
  return `Manutenção de ${tipo} no equipamento "${equipamento}" iniciou na unidade "${unidade}"`;
}

export function montarTituloProximidadeFim(manut, minutos) {
  const tipo = normalizarTipoManutencao(manut);
  const equipamento = normalizarEquipamento(manut);
  const unidade = normalizarUnidade(manut);
  const janela = formatarJanelaTempo(minutos);
  return `Manutenção de ${tipo} no equipamento "${equipamento}" termina em ${janela} na unidade "${unidade}"`;
}

export function montarTituloFim(manut) {
  const tipo = normalizarTipoManutencao(manut);
  const equipamento = normalizarEquipamento(manut);
  const unidade = normalizarUnidade(manut);
  return `Manutenção de ${tipo} no equipamento "${equipamento}" encerrou na unidade "${unidade}"`;
}

export function montarTituloConfirmacao(manut) {
  const tipo = normalizarTipoManutencao(manut);
  const equipamento = normalizarEquipamento(manut);
  const unidade = normalizarUnidade(manut);
  return `Manutenção de ${tipo} no equipamento "${equipamento}" aguarda confirmação na unidade "${unidade}"`;
}

export function montarSubtituloBase(manut) {
  const modelo = normalizarTexto(manut.equipamento?.modelo, 'Equipamento');
  const tag = normalizarTexto(manut.equipamento?.tag, 'Sem TAG');

  return `${modelo} (${tag})`;
}

export function montarSubtituloConfirmacaoFallback() {
  return 'O horario agendado terminou. Confirme se a manutencao foi concluida ou prorrogada.';
}

export function buildAlertId(tenantId, tipo, manutId, label = '') {
  const safeTenant = String(tenantId).trim();
  const safeTipo = String(tipo).trim().toLowerCase();
  const safeId = String(manutId).trim();
  const safeLabel = label ? `-${String(label).trim().toLowerCase()}` : '';

  return `tenant-${safeTenant}-${safeTipo}-${safeId}${safeLabel}`;
}

export function montarPayloadAlertaManutencaoBase(manut) {
  const subtituloBase = montarSubtituloBase(manut);

  return buildAlertMetaManutencao(manut, {
    subtituloBase,
  });
}
