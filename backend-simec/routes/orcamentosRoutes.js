import express from 'express';
import { admin } from '../middleware/authMiddleware.js';
import validate from '../middleware/validate.js';
import { orcamentoSchema, rejeitarSchema } from '../validators/orcamentoValidator.js';
import { registrarLog } from '../services/logService.js';
import {
  listarOrcamentos,
  buscarOrcamentoPorId,
  criarOrcamento,
  atualizarOrcamento,
  excluirOrcamento,
  enviarParaAprovacao,
  aprovarOrcamento,
  rejeitarOrcamento,
  obterMetricasOrcamentos,
} from '../services/orcamentosService.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { status, tipo } = req.query;
    const orcamentos = await listarOrcamentos({
      tenantId: req.tenantContext,
      status,
      tipo,
    });
    return res.json(orcamentos);
  } catch (error) {
    console.error('[ORCAMENTO_LIST_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao listar orÃ§amentos.' });
  }
});

router.get('/metricas', async (req, res) => {
  try {
    const metricas = await obterMetricasOrcamentos({ tenantId: req.tenantContext });
    return res.json(metricas);
  } catch (error) {
    console.error('[ORCAMENTO_METRICAS_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao buscar mÃ©tricas.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const orcamento = await buscarOrcamentoPorId({
      tenantId: req.tenantContext,
      id: req.params.id,
    });
    return res.json(orcamento);
  } catch (error) {
    console.error('[ORCAMENTO_GET_ERROR]', error);
    if (error.status) return res.status(error.status).json({ message: error.message });
    return res.status(500).json({ message: 'Erro ao buscar orÃ§amento.' });
  }
});

router.post('/', validate(orcamentoSchema), async (req, res) => {
  try {
    const dados = req.validatedData;
    const orcamento = await criarOrcamento({
      tenantId: req.tenantContext,
      criadoPorId: req.usuario.id,
      dados,
    });

    await registrarLog({
      tenantId: req.tenantContext,
      usuarioId: req.usuario.id,
      acao: 'CRIAÃ‡ÃƒO',
      entidade: 'Orcamento',
      entidadeId: orcamento.id,
      detalhes: `OrÃ§amento "${orcamento.titulo}" criado.`,
    });

    return res.status(201).json(orcamento);
  } catch (error) {
    console.error('[ORCAMENTO_CREATE_ERROR]', error);
    if (error.status) return res.status(error.status).json({ message: error.message });
    return res.status(500).json({ message: 'Erro ao criar orÃ§amento.' });
  }
});

router.put('/:id', validate(orcamentoSchema), async (req, res) => {
  try {
    const dados = req.validatedData;
    const orcamento = await atualizarOrcamento({
      tenantId: req.tenantContext,
      id: req.params.id,
      dados,
    });

    await registrarLog({
      tenantId: req.tenantContext,
      usuarioId: req.usuario.id,
      acao: 'EDIÃ‡ÃƒO',
      entidade: 'Orcamento',
      entidadeId: req.params.id,
      detalhes: `OrÃ§amento "${orcamento.titulo}" atualizado.`,
    });

    return res.json(orcamento);
  } catch (error) {
    console.error('[ORCAMENTO_UPDATE_ERROR]', error);
    if (error.status) return res.status(error.status).json({ message: error.message });
    return res.status(500).json({ message: 'Erro ao atualizar orÃ§amento.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await excluirOrcamento({
      tenantId: req.tenantContext,
      id: req.params.id,
    });

    await registrarLog({
      tenantId: req.tenantContext,
      usuarioId: req.usuario.id,
      acao: 'EXCLUSÃƒO',
      entidade: 'Orcamento',
      entidadeId: req.params.id,
      detalhes: `OrÃ§amento excluÃ­do.`,
    });

    return res.status(204).send();
  } catch (error) {
    console.error('[ORCAMENTO_DELETE_ERROR]', error);
    if (error.status) return res.status(error.status).json({ message: error.message });
    return res.status(500).json({ message: 'Erro ao excluir orÃ§amento.' });
  }
});

router.post('/:id/enviar-aprovacao', async (req, res) => {
  try {
    const orcamento = await enviarParaAprovacao({
      tenantId: req.tenantContext,
      id: req.params.id,
    });

    await registrarLog({
      tenantId: req.tenantContext,
      usuarioId: req.usuario.id,
      acao: 'EDIÃ‡ÃƒO',
      entidade: 'Orcamento',
      entidadeId: req.params.id,
      detalhes: `OrÃ§amento "${orcamento.titulo}" enviado para aprovaÃ§Ã£o.`,
    });

    return res.json(orcamento);
  } catch (error) {
    console.error('[ORCAMENTO_ENVIAR_ERROR]', error);
    if (error.status) return res.status(error.status).json({ message: error.message });
    return res.status(500).json({ message: 'Erro ao enviar orÃ§amento para aprovaÃ§Ã£o.' });
  }
});

router.post('/:id/aprovar', admin, async (req, res) => {
  try {
    const { fornecedorAprovadoId } = req.body || {};
    const orcamento = await aprovarOrcamento({
      tenantId: req.tenantContext,
      id: req.params.id,
      aprovadoPorId: req.usuario.id,
      fornecedorAprovadoId: fornecedorAprovadoId || null,
    });

    await registrarLog({
      tenantId: req.tenantContext,
      usuarioId: req.usuario.id,
      acao: 'EDIÃ‡ÃƒO',
      entidade: 'Orcamento',
      entidadeId: req.params.id,
      detalhes: `OrÃ§amento "${orcamento.titulo}" aprovado.`,
    });

    return res.json(orcamento);
  } catch (error) {
    console.error('[ORCAMENTO_APROVAR_ERROR]', error);
    if (error.status) return res.status(error.status).json({ message: error.message });
    return res.status(500).json({ message: 'Erro ao aprovar orÃ§amento.' });
  }
});

router.post('/:id/rejeitar', admin, validate(rejeitarSchema), async (req, res) => {
  try {
    const { motivoRejeicao } = req.validatedData;
    const orcamento = await rejeitarOrcamento({
      tenantId: req.tenantContext,
      id: req.params.id,
      aprovadoPorId: req.usuario.id,
      motivoRejeicao,
    });

    await registrarLog({
      tenantId: req.tenantContext,
      usuarioId: req.usuario.id,
      acao: 'EDIÃ‡ÃƒO',
      entidade: 'Orcamento',
      entidadeId: req.params.id,
      detalhes: `OrÃ§amento "${orcamento.titulo}" rejeitado. Motivo: ${motivoRejeicao}`,
    });

    return res.json(orcamento);
  } catch (error) {
    console.error('[ORCAMENTO_REJEITAR_ERROR]', error);
    if (error.status) return res.status(error.status).json({ message: error.message });
    return res.status(500).json({ message: 'Erro ao rejeitar orÃ§amento.' });
  }
});

export default router;
