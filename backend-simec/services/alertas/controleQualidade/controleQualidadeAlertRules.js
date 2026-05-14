// Regras de geracao de alertas para Controle de Qualidade.
// Padroes: vencimento (com escalonamento de prioridade) + reprovacao.

import {
  criarPayloadBaseAlerta,
  ALERT_CATEGORIAS,
  ALERT_EVENTOS,
  ALERT_PRIORIDADES,
} from '../alertPayloadFactory.js';

import {
  extractLocalDateFromIso,
  diffLocalDateInDays,
} from '../../time/index.js';

import { upsertAlertaCQ } from './controleQualidadeAlertRepository.js';

// Pontos de escalonamento de vencimento (do mais proximo ao mais distante)
const PONTOS_VENCIMENTO = [
  { limiar: 1,  prioridade: ALERT_PRIORIDADES.ALTA,  label: '1d',  texto: 'amanha' },
  { limiar: 7,  prioridade: ALERT_PRIORIDADES.ALTA,  label: '7d',  texto: 'em 7 dias' },
  { limiar: 30, prioridade: ALERT_PRIORIDADES.MEDIA, label: '30d', texto: 'em 30 dias' },
  { limiar: 60, prioridade: ALERT_PRIORIDADES.MEDIA, label: '60d', texto: 'em 60 dias' },
  { limiar: 90, prioridade: ALERT_PRIORIDADES.BAIXA, label: '90d', texto: 'em 90 dias' },
];

function buildAlertId(tenantId, kind, equipamentoId, tipoTesteId, suffix = '') {
  return `cq-${kind}-${tenantId}-${equipamentoId}-${tipoTesteId}${suffix ? `-${suffix}` : ''}`;
}

function rotuloEquipamento(v) {
  return v.equipamentoApelido || v.equipamentoTag || v.equipamentoModelo || 'Equipamento';
}

// Gera (ou atualiza) alertas para UM registro de vencimento ativo.
// Retorna a lista de alertaIds gerados (para limpeza de orfaos depois).
export async function gerarAlertasParaVencimento(tenantId, vencimento, agoraUtc, timezone) {
  const idsGerados = [];
  const eqRotulo = rotuloEquipamento(vencimento);
  const tipoNome = vencimento.tipoTesteNome || vencimento.tipoTesteCodigo;

  // ─── 1. Reprovacao pendente (independente de vencimento) ──────────────────
  if (vencimento.resultado === 'Reprovado') {
    const id = buildAlertId(tenantId, 'reprovado', vencimento.equipamentoId, vencimento.tipoTesteId);
    await upsertAlertaCQ(
      tenantId, id,
      criarPayloadBaseAlerta({
        id,
        titulo:        `Teste de qualidade REPROVADO - ${tipoNome}`,
        subtitulo:     `${eqRotulo}: aguardando acao corretiva.`,
        data:          vencimento.dataExecucao || agoraUtc,
        prioridade:    ALERT_PRIORIDADES.ALTA,
        tipoCategoria: ALERT_CATEGORIAS.CONTROLE_QUALIDADE,
        tipoEvento:    ALERT_EVENTOS.TESTE_QUALIDADE_REPROVADO,
        link:          `/equipamentos/detalhes/${vencimento.equipamentoId}`,
      })
    );
    idsGerados.push(id);
  }

  // ─── 2. Vencimento (escalonado) ───────────────────────────────────────────
  const dataIso = vencimento.proximoVencimento instanceof Date
    ? vencimento.proximoVencimento.toISOString()
    : String(vencimento.proximoVencimento);
  const hojeLocal = extractLocalDateFromIso(agoraUtc.toISOString(), timezone);
  const venctoLocal = extractLocalDateFromIso(dataIso, timezone);
  if (!hojeLocal || !venctoLocal) return idsGerados;

  const diasRestantes = diffLocalDateInDays({ fromDateLocal: hojeLocal, toDateLocal: venctoLocal });
  if (diasRestantes === null) return idsGerados;

  // 2a. Vencido
  if (diasRestantes <= 0) {
    const id = buildAlertId(tenantId, 'vencido', vencimento.equipamentoId, vencimento.tipoTesteId);
    const diasAtraso = Math.abs(diasRestantes);
    await upsertAlertaCQ(
      tenantId, id,
      criarPayloadBaseAlerta({
        id,
        titulo:        `CQ vencido: ${tipoNome}`,
        subtitulo:     `${eqRotulo}: vencido${diasAtraso > 0 ? ` ha ${diasAtraso} dia(s)` : ' hoje'}.${vencimento.tipoTesteObrigatorio ? ' Teste obrigatorio - risco de nao-conformidade ANVISA.' : ''}`,
        data:          vencimento.proximoVencimento,
        prioridade:    ALERT_PRIORIDADES.ALTA,
        tipoCategoria: ALERT_CATEGORIAS.CONTROLE_QUALIDADE,
        tipoEvento:    ALERT_EVENTOS.TESTE_QUALIDADE_VENCIDO,
        link:          `/equipamentos/detalhes/${vencimento.equipamentoId}`,
      })
    );
    idsGerados.push(id);
    return idsGerados;
  }

  // 2b. Vencendo - cria alerta no menor limiar aplicavel apenas
  for (const ponto of PONTOS_VENCIMENTO) {
    if (diasRestantes <= ponto.limiar) {
      const id = buildAlertId(tenantId, 'vence', vencimento.equipamentoId, vencimento.tipoTesteId, ponto.label);
      await upsertAlertaCQ(
        tenantId, id,
        criarPayloadBaseAlerta({
          id,
          titulo:        `CQ vence ${ponto.texto}: ${tipoNome}`,
          subtitulo:     `${eqRotulo}: agendar renovacao do teste.`,
          data:          vencimento.proximoVencimento,
          prioridade:    ponto.prioridade,
          tipoCategoria: ALERT_CATEGORIAS.CONTROLE_QUALIDADE,
          tipoEvento:    ALERT_EVENTOS.TESTE_QUALIDADE_VENCE,
          link:          `/equipamentos/detalhes/${vencimento.equipamentoId}`,
        })
      );
      idsGerados.push(id);
      break; // so o limiar mais proximo
    }
  }

  return idsGerados;
}
