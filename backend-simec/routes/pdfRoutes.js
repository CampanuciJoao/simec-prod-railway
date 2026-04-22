import express from 'express';
import { proteger } from '../middleware/authMiddleware.js';
import {
  gerarPdfBIBuffer,
  gerarPdfHistoricoEquipamentoBuffer,
  gerarPdfOcorrenciaBuffer,
  gerarPdfOSManutencaoBuffer,
  gerarPdfRelatorioBuffer,
} from '../services/pdf/pdfDocumentService.js';
import {
  obterDadosPdfBI,
  obterDadosPdfHistoricoEquipamento,
  obterDadosPdfManutencao,
  obterDadosPdfOcorrencia,
  obterDadosPdfRelatorio,
  obterDadosPdfRelatorioPorIds,
} from '../services/pdf/pdfQueryService.js';

const router = express.Router();

router.use(proteger);

function getPdfOptions(req) {
  return {
    locale: req.usuario?.tenant?.locale || 'pt-BR',
    timeZone: req.usuario?.tenant?.timezone || 'America/Cuiaba',
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
  };

  const [status, message] = knownStatus[error?.message] || [500, fallbackMessage];
  return res.status(status).json({ message });
}

router.get('/bi', async (req, res) => {
  try {
    const dados = await obterDadosPdfBI({
      tenantId: req.usuario.tenantId,
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
      tenantId: req.usuario.tenantId,
      manutencaoId: req.params.id,
    });
    const buffer = await gerarPdfOSManutencaoBuffer(manutencao, getPdfOptions(req));
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
      tenantId: req.usuario.tenantId,
      filtros: req.body || {},
    });
    const buffer = await gerarPdfRelatorioBuffer(resultado, getPdfOptions(req));
    const nomeBase =
      resultado.tipoRelatorio === 'inventarioEquipamentos'
        ? 'relatorio_inventario_equipamentos'
        : 'relatorio_manutencoes_realizadas';

    return sendPdf(res, buffer, `${nomeBase}.pdf`);
  } catch (error) {
    console.error('[PDF_RELATORIO_ERROR]', error);
    return mapErrorToResponse(res, error, 'Erro ao gerar PDF do relatorio.');
  }
});

router.post('/relatorio/manutencoes-ids', async (req, res) => {
  try {
    const resultado = await obterDadosPdfRelatorioPorIds({
      tenantId: req.usuario.tenantId,
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
      tenantId: req.usuario.tenantId,
      ocorrenciaId: req.params.id,
    });
    const buffer = await gerarPdfOcorrenciaBuffer(ocorrencia, getPdfOptions(req));
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
      tenantId: req.usuario.tenantId,
      equipamentoId: req.params.id,
      categoria: req.query?.categoria || null,
      subcategoria: req.query?.subcategoria || null,
      dataInicio: req.query?.dataInicio || null,
      dataFim: req.query?.dataFim || null,
    });
    const buffer = await gerarPdfHistoricoEquipamentoBuffer(
      payload,
      getPdfOptions(req)
    );
    const fileName = `auditoria_${payload?.equipamento?.tag || 'Equipamento'}.pdf`;

    return sendPdf(res, buffer, fileName);
  } catch (error) {
    console.error('[PDF_HISTORICO_ERROR]', error);
    return mapErrorToResponse(res, error, 'Erro ao gerar PDF do historico do equipamento.');
  }
});

export default router;
