import express from 'express';
import prisma from '../services/prismaService.js';
import { proteger } from '../middleware/authMiddleware.js';
import {
  gerarPdfBIBuffer,
  gerarPdfConformidadeCqBuffer,
  gerarPdfHistoricoEquipamentoBuffer,
  gerarPdfOcorrenciaBuffer,
  gerarPdfOSManutencaoBuffer,
  gerarPdfRelatorioBuffer,
  gerarPdfUtilizacaoGehcBuffer,
} from '../services/pdf/pdfDocumentService.js';
import { obterDadosPdfConformidadeCq } from '../services/pdf/conformidadeCqPdfService.js';
import { obterDadosPdfOrcamentoCq } from '../services/pdf/orcamentoCqPdfService.js';
import { gerarPdfOrcamentoCqBuffer } from '../services/pdf/pdfDocumentService.js';
import {
  obterDadosPdfBI,
  obterDadosPdfHistoricoEquipamento,
  obterDadosPdfManutencao,
  obterDadosPdfOcorrencia,
  obterDadosPdfRelatorio,
  obterDadosPdfRelatorioPorIds,
} from '../services/pdf/pdfQueryService.js';
import {
  obterDadosPdfOrcamento,
  gerarPdfOrcamentoBuffer,
} from '../services/pdf/orcamentoPdfService.js';
import {
  obterDadosPdfOsCorretiva,
  gerarPdfOsCorretivaBuffer,
} from '../services/pdf/osCorretivaPdfService.js';
import { obterDadosPdfContrato } from '../services/pdf/contratosPdfService.js';
import { gerarPdfContratoBuffer } from '../services/pdf/pdfDocumentService.js';

const router = express.Router();

router.use(proteger);

function getPdfOptions(req, unidadeTimezone = null) {
  return {
    locale: req.usuario?.tenant?.locale || 'pt-BR',
    timeZone: unidadeTimezone || req.usuario?.tenant?.timezone || 'UTC',
  };
}

function sendPdf(res, buffer, fileName) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  return res.status(200).send(buffer);
}

function mapErrorToResponse(res, error, fallbackMessage) {
  const knownStatus = {
    TIPO_RELATORIO_OBRIGATORIO: [400, 'O tipo de relatorio e obrigatorio.'],
    TIPO_RELATORIO_INVALIDO: [400, 'Tipo de relatorio invalido ou nao implementado.'],
    PERIODO_OBRIGATORIO: [400, 'Periodo de datas e obrigatorio para este relatorio.'],
    PERIODO_INVALIDO: [400, 'As datas informadas sao invalidas.'],
    PERIODO_INVERTIDO: [400, 'A data inicial nao pode ser maior que a data final.'],
    IDS_RELATORIO_INVALIDOS: [400, 'E necessario informar IDs validos para gerar o PDF.'],
    MANUTENCAO_ID_INVALIDO: [400, 'O id da manutencao e obrigatorio.'],
    MANUTENCAO_NAO_ENCONTRADA: [404, 'Manutencao nao encontrada.'],
    EQUIPAMENTO_NAO_ENCONTRADO: [404, 'Equipamento nao encontrado.'],
    OCORRENCIA_ID_INVALIDO: [400, 'O id da ocorrencia e obrigatorio.'],
    OCORRENCIA_NAO_ENCONTRADA: [404, 'Ocorrencia nao encontrada.'],
    ORCAMENTO_ID_INVALIDO: [400, 'O id do orcamento e obrigatorio.'],
    ORCAMENTO_NAO_ENCONTRADO: [404, 'Orcamento nao encontrado.'],
    UNIDADE_OBRIGATORIA: [400, 'A unidade e obrigatoria para o relatorio de conformidade.'],
    UNIDADE_NAO_ENCONTRADA: [404, 'Unidade nao encontrada.'],
  };

  const [status, message] = knownStatus[error?.message] || [500, fallbackMessage];
  return res.status(status).json({ message });
}

router.get('/bi', async (req, res) => {
  try {
    const dados = await obterDadosPdfBI({
      tenantId: req.tenantContext,
    });
    const buffer = await gerarPdfBIBuffer(dados, getPdfOptions(req));
    const fileName = `BI_ESTRATEGICO_SIMEC_${dados.ano || 'ANO'}.pdf`;

    return sendPdf(res, buffer, fileName);
  } catch (error) {
    console.error('[PDF_BI_ERROR]', error);
    return mapErrorToResponse(res, error, 'Erro ao gerar PDF de BI.');
  }
});

router.get('/manutencao/:id', async (req, res) => {
  try {
    const manutencao = await obterDadosPdfManutencao({
      tenantId: req.tenantContext,
      manutencaoId: req.params.id,
    });
    const buffer = await gerarPdfOSManutencaoBuffer(
      manutencao,
      getPdfOptions(req, manutencao.equipamento?.unidade?.timezone)
    );
    const fileName = `OS_${manutencao.numeroOS || 'SEM_NUMERO'}.pdf`;

    return sendPdf(res, buffer, fileName);
  } catch (error) {
    console.error('[PDF_OS_ERROR]', error);
    return mapErrorToResponse(res, error, 'Erro ao gerar PDF da OS.');
  }
});

router.post('/relatorio', async (req, res) => {
  try {
    const resultado = await obterDadosPdfRelatorio({
      tenantId: req.tenantContext,
      filtros: req.body || {},
    });
    const buffer = await gerarPdfRelatorioBuffer(resultado, getPdfOptions(req));
    const nomeBase = {
      inventarioEquipamentos:  'relatorio_inventario_equipamentos',
      inventarioSeguros:       'relatorio_seguros',
      manutencoesRealizadas:   'relatorio_manutencoes_realizadas',
    }[resultado.tipoRelatorio] || 'relatorio';

    return sendPdf(res, buffer, `${nomeBase}.pdf`);
  } catch (error) {
    console.error('[PDF_RELATORIO_ERROR]', error);
    return mapErrorToResponse(res, error, 'Erro ao gerar PDF do relatorio.');
  }
});

router.post('/relatorio/manutencoes-ids', async (req, res) => {
  try {
    const resultado = await obterDadosPdfRelatorioPorIds({
      tenantId: req.tenantContext,
      ids: req.body?.ids || [],
    });
    const buffer = await gerarPdfRelatorioBuffer(resultado, getPdfOptions(req));
    return sendPdf(res, buffer, 'relatorio_chat_agente.pdf');
  } catch (error) {
    console.error('[PDF_RELATORIO_IDS_ERROR]', error);
    return mapErrorToResponse(res, error, 'Erro ao gerar PDF do relatorio.');
  }
});

router.get('/ocorrencia/:id', async (req, res) => {
  try {
    const ocorrencia = await obterDadosPdfOcorrencia({
      tenantId: req.tenantContext,
      ocorrenciaId: req.params.id,
    });
    const buffer = await gerarPdfOcorrenciaBuffer(
      ocorrencia,
      getPdfOptions(req, ocorrencia.equipamento?.unidade?.timezone)
    );
    const tag = ocorrencia.equipamento?.tag || 'EQ';
    const suffix = ocorrencia.id.slice(-6).toUpperCase();
    return sendPdf(res, buffer, `ocorrencia_${tag}_${suffix}.pdf`);
  } catch (error) {
    console.error('[PDF_OCORRENCIA_ERROR]', error);
    return mapErrorToResponse(res, error, 'Erro ao gerar PDF da ocorrencia.');
  }
});

router.get('/equipamentos/:id/historico', async (req, res) => {
  try {
    const payload = await obterDadosPdfHistoricoEquipamento({
      tenantId: req.tenantContext,
      equipamentoId: req.params.id,
      categoria: req.query?.categoria || null,
      subcategoria: req.query?.subcategoria || null,
      dataInicio: req.query?.dataInicio || null,
      dataFim: req.query?.dataFim || null,
    });
    const buffer = await gerarPdfHistoricoEquipamentoBuffer(
      payload,
      getPdfOptions(req, payload.equipamento?.unidadeTimezone)
    );
    const fileName = `auditoria_${payload?.equipamento?.tag || 'Equipamento'}.pdf`;

    return sendPdf(res, buffer, fileName);
  } catch (error) {
    console.error('[PDF_HISTORICO_ERROR]', error);
    return mapErrorToResponse(res, error, 'Erro ao gerar PDF do historico do equipamento.');
  }
});

router.get('/orcamento/:id', async (req, res) => {
  try {
    const orcamento = await obterDadosPdfOrcamento({
      tenantId: req.tenantContext,
      orcamentoId: req.params.id,
    });
    const buffer = await gerarPdfOrcamentoBuffer(orcamento, getPdfOptions(req));
    const suffix = orcamento.id.slice(-6).toUpperCase();
    return sendPdf(res, buffer, `orcamento_${suffix}.pdf`);
  } catch (error) {
    console.error('[PDF_ORCAMENTO_ERROR]', error);
    return mapErrorToResponse(res, error, 'Erro ao gerar PDF do orçamento.');
  }
});

router.get('/os-corretiva/:id', async (req, res) => {
  try {
    const os = await obterDadosPdfOsCorretiva({
      tenantId: req.tenantContext,
      osId: req.params.id,
    });
    const buffer = await gerarPdfOsCorretivaBuffer(
      os,
      getPdfOptions(req, os.equipamento?.unidade?.timezone)
    );
    return sendPdf(res, buffer, `OS_CORT_${os.numeroOS || req.params.id}.pdf`);
  } catch (error) {
    console.error('[PDF_OS_CORRETIVA_ERROR]', error);
    if (error.message === 'OS_NAO_ENCONTRADA') {
      return res.status(404).json({ message: 'OS Corretiva não encontrada.' });
    }
    return res.status(500).json({ message: 'Erro ao gerar PDF da OS Corretiva.' });
  }
});

router.get('/contrato/:id', async (req, res) => {
  try {
    const contrato = await obterDadosPdfContrato({
      tenantId: req.tenantContext,
      contratoId: req.params.id,
    });
    const buffer = await gerarPdfContratoBuffer(contrato, getPdfOptions(req));
    const suffix = contrato.numeroContrato || req.params.id.slice(-6).toUpperCase();
    return sendPdf(res, buffer, `contrato_${suffix}.pdf`);
  } catch (error) {
    console.error('[PDF_CONTRATO_ERROR]', error);
    if (error.message === 'CONTRATO_NAO_ENCONTRADO') {
      return res.status(404).json({ message: 'Contrato não encontrado.' });
    }
    if (error.message === 'CONTRATO_ID_INVALIDO') {
      return res.status(400).json({ message: 'ID do contrato inválido.' });
    }
    return res.status(500).json({ message: 'Erro ao gerar PDF do contrato.' });
  }
});

// ─── GET /pdfs/gehc-utilizacao ───────────────────────────────────────────────
router.get('/gehc-utilizacao', async (req, res) => {
  try {
    const tenantId = req.tenantContext;
    const meses = Math.min(Number(req.query.meses) || 12, 36);

    const inicio = new Date();
    inicio.setMonth(inicio.getMonth() - meses);
    inicio.setDate(1);
    inicio.setHours(0, 0, 0, 0);

    const registros = await prisma.gehcUtilizacaoMensal.findMany({
      where: { tenantId, mesReferencia: { gte: inicio } },
      orderBy: { mesReferencia: 'asc' },
      include: {
        equipamento: {
          select: {
            id: true, apelido: true, modelo: true, tag: true, unidadeId: true,
            unidade: { select: { id: true, nomeSistema: true, nomeFantasia: true, cidade: true } },
          },
        },
      },
    });

    function diasNoMes(date) {
      return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    }

    function nomeUnidade(u) {
      const base = u?.nomeFantasia || u?.nomeSistema || '—';
      return u?.cidade ? `${base} — ${u.cidade}` : base;
    }

    const unidadeMap = new Map();
    for (const r of registros) {
      const eq = r.equipamento;
      if (!eq) continue;
      const uid = eq.unidadeId;
      if (!unidadeMap.has(uid)) {
        unidadeMap.set(uid, {
          nome: nomeUnidade(eq.unidade),
          equipamentos: new Map(),
        });
      }
      const uNode = unidadeMap.get(uid);
      if (!uNode.equipamentos.has(eq.id)) {
        uNode.equipamentos.set(eq.id, { nome: eq.apelido || eq.modelo || eq.tag, tag: eq.tag, meses: [] });
      }
      const dias = diasNoMes(r.mesReferencia);
      uNode.equipamentos.get(eq.id).meses.push({
        mes: r.mesReferencia.toISOString().slice(0, 7),
        exames: r.examesTotal ?? null,
        pacientes: r.pacientesTotal ?? null,
        duracaoMedia: r.duracaoMediaMin ?? null,
        uptime: r.uptimeContrato ?? null,
        mediaExamesDia: r.examesTotal != null ? +(r.examesTotal / dias).toFixed(1) : null,
      });
    }

    const unidades = [...unidadeMap.values()].map(u => {
      const equipamentos = [...u.equipamentos.values()].map(eq => {
        const totalExames = eq.meses.reduce((a, m) => a + (m.exames ?? 0), 0);
        const totalPacientes = eq.meses.reduce((a, m) => a + (m.pacientes ?? 0), 0);
        const mediasValidas = eq.meses.filter(m => m.mediaExamesDia != null);
        const uptimes = eq.meses.filter(m => m.uptime != null).map(m => m.uptime);
        return {
          ...eq,
          totalExames, totalPacientes,
          mediaExamesDia: mediasValidas.length ? +(mediasValidas.reduce((a, m) => a + m.mediaExamesDia, 0) / mediasValidas.length).toFixed(1) : null,
          uptimeMedio: uptimes.length ? +(uptimes.reduce((a, v) => a + v, 0) / uptimes.length).toFixed(1) : null,
        };
      });
      const totalExames = equipamentos.reduce((a, e) => a + e.totalExames, 0);
      const totalPacientes = equipamentos.reduce((a, e) => a + e.totalPacientes, 0);
      const uptimes = equipamentos.map(e => e.uptimeMedio).filter(v => v != null);
      return {
        nome: u.nome, totalExames, totalPacientes,
        uptimeMedio: uptimes.length ? +(uptimes.reduce((a, v) => a + v, 0) / uptimes.length).toFixed(1) : null,
        equipamentos,
      };
    });

    const totais = {
      exames: unidades.reduce((a, u) => a + u.totalExames, 0),
      pacientes: unidades.reduce((a, u) => a + u.totalPacientes, 0),
      uptimeMedio: unidades.map(u => u.uptimeMedio).filter(v => v != null).reduce((a, v, _i, arr) => a + v / arr.length, 0) || null,
    };

    const buffer = await gerarPdfUtilizacaoGehcBuffer({ periodo: { meses }, totais, unidades }, getPdfOptions(req));
    const ano = new Date().getFullYear();
    return sendPdf(res, buffer, `utilizacao_ge_${ano}.pdf`);
  } catch (err) {
    console.error('[PDF_GEHC_UTILIZACAO]', err.message);
    return res.status(500).json({ message: 'Erro ao gerar PDF de utilização GE.' });
  }
});

// PDF de Inventário Controle de Qualidade — listagem do parque pra
// cotacao. Diferenca do /conformidade-cq: foca em inventario, nao em
// status dos testes. Path mantido como 'orcamento-cq' por compat com
// clientes que ja consomem; rotulo mudou no UI/PDF pra "Inventário".
// Aceita filtros opcionais unidadeIds[] e modalidades[].
router.post('/orcamento-cq', async (req, res) => {
  try {
    const { unidadeIds, modalidades } = req.body || {};

    const dados = await obterDadosPdfOrcamentoCq({
      tenantId: req.tenantContext,
      unidadeIds: Array.isArray(unidadeIds) ? unidadeIds : null,
      modalidades: Array.isArray(modalidades) ? modalidades : null,
    });

    const buffer = await gerarPdfOrcamentoCqBuffer(dados, getPdfOptions(req));

    const dataIso = new Date().toISOString().slice(0, 10);
    return sendPdf(res, buffer, `inventario_cq_${dataIso}.pdf`);
  } catch (error) {
    console.error('[PDF_INVENTARIO_CQ_ERROR]', error);
    return mapErrorToResponse(res, error, 'Erro ao gerar inventário de CQ.');
  }
});

// PDF de Conformidade ANVISA RDC 611/2022 (Controle de Qualidade) — 1 por unidade
router.post('/conformidade-cq', async (req, res) => {
  try {
    const { unidadeId, responsavelTecnico } = req.body || {};

    const dados = await obterDadosPdfConformidadeCq({
      tenantId: req.tenantContext,
      unidadeId,
    });

    const buffer = await gerarPdfConformidadeCqBuffer(
      { ...dados, responsavelTecnico: responsavelTecnico || null },
      getPdfOptions(req)
    );

    const dataIso = new Date().toISOString().slice(0, 10);
    const slug = (dados.unidade.nomeSistema || 'unidade').replace(/[^a-z0-9]+/gi, '_').toLowerCase();
    return sendPdf(res, buffer, `conformidade_cq_${slug}_${dataIso}.pdf`);
  } catch (error) {
    console.error('[PDF_CONFORMIDADE_CQ_ERROR]', error);
    return mapErrorToResponse(res, error, 'Erro ao gerar PDF de conformidade.');
  }
});

export default router;
