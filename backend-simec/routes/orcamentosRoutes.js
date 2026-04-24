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
      tenantId: req.usuario.tenantId,
      status,
      tipo,
    });
    return res.json(orcamentos);
  } catch (error) {
    console.error('[ORCAMENTO_LIST_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao listar orçamentos.' });
  }
});

router.get('/metricas', async (req, res) => {
  try {
    const metricas = await obterMetricasOrcamentos({ tenantId: req.usuario.tenantId });
    return res.json(metricas);
  } catch (error) {
    console.error('[ORCAMENTO_METRICAS_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao buscar métricas.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const orcamento = await buscarOrcamentoPorId({
      tenantId: req.usuario.tenantId,
      id: req.params.id,
    });
    return res.json(orcamento);
  } catch (error) {
    console.error('[ORCAMENTO_GET_ERROR]', error);
    if (error.status) return res.status(error.status).json({ message: error.message });
    return res.status(500).json({ message: 'Erro ao buscar orçamento.' });
  }
});

router.post('/', validate(orcamentoSchema), async (req, res) => {
  try {
    const dados = req.validatedData || req.body;
    const orcamento = await criarOrcamento({
      tenantId: req.usuario.tenantId,
      criadoPorId: req.usuario.id,
      dados,
    });

    await registrarLog({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      acao: 'CRIAÇÃO',
      entidade: 'Orcamento',
      entidadeId: orcamento.id,
      detalhes: `Orçamento "${orcamento.titulo}" criado.`,
    });

    return res.status(201).json(orcamento);
  } catch (error) {
    console.error('[ORCAMENTO_CREATE_ERROR]', error);
    if (error.status) return res.status(error.status).json({ message: error.message });
    return res.status(500).json({ message: 'Erro ao criar orçamento.' });
  }
});

router.put('/:id', validate(orcamentoSchema), async (req, res) => {
  try {
    const dados = req.validatedData || req.body;
    const orcamento = await atualizarOrcamento({
      tenantId: req.usuario.tenantId,
      id: req.params.id,
      dados,
    });

    await registrarLog({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      acao: 'EDIÇÃO',
      entidade: 'Orcamento',
      entidadeId: req.params.id,
      detalhes: `Orçamento "${orcamento.titulo}" atualizado.`,
    });

    return res.json(orcamento);
  } catch (error) {
    console.error('[ORCAMENTO_UPDATE_ERROR]', error);
    if (error.status) return res.status(error.status).json({ message: error.message });
    return res.status(500).json({ message: 'Erro ao atualizar orçamento.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await excluirOrcamento({
      tenantId: req.usuario.tenantId,
      id: req.params.id,
    });

    await registrarLog({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      acao: 'EXCLUSÃO',
      entidade: 'Orcamento',
      entidadeId: req.params.id,
      detalhes: `Orçamento excluído.`,
    });

    return res.status(204).send();
  } catch (error) {
    console.error('[ORCAMENTO_DELETE_ERROR]', error);
    if (error.status) return res.status(error.status).json({ message: error.message });
    return res.status(500).json({ message: 'Erro ao excluir orçamento.' });
  }
});

router.post('/:id/enviar-aprovacao', async (req, res) => {
  try {
    const orcamento = await enviarParaAprovacao({
      tenantId: req.usuario.tenantId,
      id: req.params.id,
    });

    await registrarLog({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      acao: 'EDIÇÃO',
      entidade: 'Orcamento',
      entidadeId: req.params.id,
      detalhes: `Orçamento "${orcamento.titulo}" enviado para aprovação.`,
    });

    return res.json(orcamento);
  } catch (error) {
    console.error('[ORCAMENTO_ENVIAR_ERROR]', error);
    if (error.status) return res.status(error.status).json({ message: error.message });
    return res.status(500).json({ message: 'Erro ao enviar orçamento para aprovação.' });
  }
});

router.post('/:id/aprovar', admin, async (req, res) => {
  try {
    const orcamento = await aprovarOrcamento({
      tenantId: req.usuario.tenantId,
      id: req.params.id,
      aprovadoPorId: req.usuario.id,
    });

    await registrarLog({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      acao: 'EDIÇÃO',
      entidade: 'Orcamento',
      entidadeId: req.params.id,
      detalhes: `Orçamento "${orcamento.titulo}" aprovado.`,
    });

    return res.json(orcamento);
  } catch (error) {
    console.error('[ORCAMENTO_APROVAR_ERROR]', error);
    if (error.status) return res.status(error.status).json({ message: error.message });
    return res.status(500).json({ message: 'Erro ao aprovar orçamento.' });
  }
});

router.post('/:id/rejeitar', admin, validate(rejeitarSchema), async (req, res) => {
  try {
    const { motivoRejeicao } = req.validatedData || req.body;
    const orcamento = await rejeitarOrcamento({
      tenantId: req.usuario.tenantId,
      id: req.params.id,
      aprovadoPorId: req.usuario.id,
      motivoRejeicao,
    });

    await registrarLog({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      acao: 'EDIÇÃO',
      entidade: 'Orcamento',
      entidadeId: req.params.id,
      detalhes: `Orçamento "${orcamento.titulo}" rejeitado. Motivo: ${motivoRejeicao}`,
    });

    return res.json(orcamento);
  } catch (error) {
    console.error('[ORCAMENTO_REJEITAR_ERROR]', error);
    if (error.status) return res.status(error.status).json({ message: error.message });
    return res.status(500).json({ message: 'Erro ao rejeitar orçamento.' });
  }
});

export default router;
