import express from 'express';

import { proteger, admin } from '../middleware/authMiddleware.js';

import { uploadFor } from '../middleware/uploadMiddleware.js';
import {
  adicionarAnexos,
  removerAnexo,
} from '../services/uploads/anexoService.js';
import { registrarLog } from '../services/logService.js';

import {
  listarTestesService,
  obterTesteService,
  listarTestesDoEquipamentoService,
  criarTesteService,
  atualizarTesteService,
  excluirTesteService,
  restaurarTesteService,
  atualizarPendenciaService,
  adicionarPendenciaService,
  ativarProgramaService,
  dashboardService,
} from '../services/controleQualidade/index.js';

import {
  listarTiposService,
  criarTipoService,
  atualizarTipoService,
} from '../services/controleQualidade/tiposTesteService.js';

import { buscarTestePorId, listarTipos } from '../services/controleQualidade/controleQualidadeRepository.js';
import { extrairLaudoCq } from '../services/controleQualidade/laudoLlmExtractor.js';
import { matchEquipamento } from '../services/controleQualidade/equipamentoMatcher.js';
import {
  extrairLoteService,
  criarLoteService,
  descartarLoteService,
} from '../services/controleQualidade/importacaoLoteService.js';

const router = express.Router();
router.use(proteger);

// ─── Catalogo de tipos de teste ─────────────────────────────────────────────

router.get('/tipos', async (req, res) => {
  try {
    const r = await listarTiposService({
      tenantId: req.usuario.tenantId,
      modalidade: req.query.modalidade || null,
      somenteAtivos: req.query.somenteAtivos !== 'false',
    });
    return res.json(r.data);
  } catch (e) {
    console.error('[CQ_TIPOS_LIST_ERROR]', e);
    return res.status(500).json({ message: 'Erro ao listar tipos.' });
  }
});

router.post('/tipos', admin, async (req, res) => {
  try {
    const r = await criarTipoService({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      dados: req.body,
    });
    if (!r.ok) {
      return res.status(r.status).json({
        message: r.message,
        ...(r.fieldErrors ? { fieldErrors: r.fieldErrors } : {}),
      });
    }
    return res.status(r.status).json(r.data);
  } catch (e) {
    console.error('[CQ_TIPO_CREATE_ERROR]', e);
    return res.status(500).json({ message: 'Erro ao criar tipo de teste.' });
  }
});

router.put('/tipos/:id', admin, async (req, res) => {
  try {
    const r = await atualizarTipoService({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      tipoId: req.params.id,
      dados: req.body,
    });
    if (!r.ok) {
      return res.status(r.status).json({
        message: r.message,
        ...(r.fieldErrors ? { fieldErrors: r.fieldErrors } : {}),
      });
    }
    return res.json(r.data);
  } catch (e) {
    console.error('[CQ_TIPO_UPDATE_ERROR]', e);
    return res.status(500).json({ message: 'Erro ao atualizar tipo de teste.' });
  }
});

// ─── Dashboard ──────────────────────────────────────────────────────────────

router.get('/dashboard', async (req, res) => {
  try {
    const r = await dashboardService({ tenantId: req.usuario.tenantId });
    return res.json(r.data);
  } catch (e) {
    console.error('[CQ_DASHBOARD_ERROR]', e);
    return res.status(500).json({ message: 'Erro ao calcular dashboard.' });
  }
});

// ─── Programa por equipamento ───────────────────────────────────────────────

router.post('/equipamento/:equipamentoId/programa', async (req, res) => {
  try {
    const r = await ativarProgramaService({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      equipamentoId: req.params.equipamentoId,
      codigos: Array.isArray(req.body?.codigos) ? req.body.codigos : null,
    });
    if (!r.ok) return res.status(r.status).json({ message: r.message });
    return res.status(201).json(r.data);
  } catch (e) {
    console.error('[CQ_PROGRAMA_ERROR]', e);
    return res.status(500).json({ message: 'Erro ao ativar programa.' });
  }
});

// ─── Testes ─────────────────────────────────────────────────────────────────

router.get('/testes', async (req, res) => {
  try {
    const data = await listarTestesService({
      tenantId: req.usuario.tenantId,
      filtros: req.query,
    });
    return res.json(data);
  } catch (e) {
    console.error('[CQ_TESTES_LIST_ERROR]', e);
    return res.status(500).json({ message: 'Erro ao listar testes.' });
  }
});

router.get('/testes/equipamento/:equipamentoId', async (req, res) => {
  try {
    const r = await listarTestesDoEquipamentoService({
      tenantId: req.usuario.tenantId,
      equipamentoId: req.params.equipamentoId,
    });
    return res.json(r.data);
  } catch (e) {
    console.error('[CQ_TESTES_EQ_ERROR]', e);
    return res.status(500).json({ message: 'Erro ao listar testes do equipamento.' });
  }
});

router.get('/testes/:id', async (req, res) => {
  try {
    const r = await obterTesteService({
      tenantId: req.usuario.tenantId,
      testeId: req.params.id,
    });
    if (!r.ok) return res.status(r.status).json({ message: r.message });
    return res.json(r.data);
  } catch (e) {
    console.error('[CQ_TESTE_GET_ERROR]', e);
    return res.status(500).json({ message: 'Erro ao buscar teste.' });
  }
});

router.post('/testes', async (req, res) => {
  try {
    const r = await criarTesteService({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      dados: req.body,
    });
    if (!r.ok) {
      return res.status(r.status).json({
        message: r.message,
        ...(r.fieldErrors ? { fieldErrors: r.fieldErrors } : {}),
      });
    }
    return res.status(r.status).json(r.data);
  } catch (e) {
    console.error('[CQ_TESTE_CREATE_ERROR]', e);
    return res.status(500).json({ message: 'Erro ao registrar teste.' });
  }
});

router.put('/testes/:id', async (req, res) => {
  try {
    const r = await atualizarTesteService({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      testeId: req.params.id,
      dados: req.body,
    });
    if (!r.ok) {
      return res.status(r.status).json({
        message: r.message,
        ...(r.fieldErrors ? { fieldErrors: r.fieldErrors } : {}),
      });
    }
    return res.json(r.data);
  } catch (e) {
    console.error('[CQ_TESTE_UPDATE_ERROR]', e);
    return res.status(500).json({ message: 'Erro ao atualizar teste.' });
  }
});

// Exclusao com justificativa obrigatoria (soft delete) - role normal pode
router.delete('/testes/:id', async (req, res) => {
  try {
    const r = await excluirTesteService({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      testeId: req.params.id,
      dados: req.body,
    });
    if (!r.ok) {
      return res.status(r.status).json({
        message: r.message,
        ...(r.fieldErrors ? { fieldErrors: r.fieldErrors } : {}),
      });
    }
    return res.status(204).send();
  } catch (e) {
    console.error('[CQ_TESTE_DELETE_ERROR]', e);
    return res.status(500).json({ message: 'Erro ao excluir teste.' });
  }
});

// Restauracao (admin only)
router.post('/testes/:id/restaurar', admin, async (req, res) => {
  try {
    const r = await restaurarTesteService({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      testeId: req.params.id,
    });
    if (!r.ok) return res.status(r.status).json({ message: r.message });
    return res.json(r.data);
  } catch (e) {
    console.error('[CQ_TESTE_RESTORE_ERROR]', e);
    return res.status(500).json({ message: 'Erro ao restaurar teste.' });
  }
});

// ─── Pendencias ─────────────────────────────────────────────────────────────

router.patch('/testes/:id/pendencias/:idx', async (req, res) => {
  try {
    const r = await atualizarPendenciaService({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      testeId: req.params.id,
      indice: req.params.idx,
      dados: { resolvido: !!req.body?.resolvido, observacao: req.body?.observacao },
    });
    if (!r.ok) return res.status(r.status).json({ message: r.message });
    return res.json(r.data);
  } catch (e) {
    console.error('[CQ_PENDENCIA_UPDATE_ERROR]', e);
    return res.status(500).json({ message: 'Erro ao atualizar pendencia.' });
  }
});

router.post('/testes/:id/pendencias', async (req, res) => {
  try {
    const r = await adicionarPendenciaService({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      testeId: req.params.id,
      dados: { descricao: String(req.body?.descricao || '').trim() },
    });
    if (!r.ok) return res.status(r.status).json({ message: r.message });
    return res.status(r.status).json(r.data);
  } catch (e) {
    console.error('[CQ_PENDENCIA_CREATE_ERROR]', e);
    return res.status(500).json({ message: 'Erro ao adicionar pendencia.' });
  }
});

// ─── Extracao LLM de laudo (sincrono, nao persiste) ────────────────────────
//
// Recebe 1 PDF via multipart, roda LLM, devolve campos sugeridos para o
// RegistrarTesteForm pre-preencher. PDF nao eh salvo aqui — usuario fara
// upload normal via /testes/:id/anexos depois de salvar o teste.
router.post('/extrair-laudo', uploadFor('controleQualidade'), async (req, res) => {
  try {
    const tenantId = req.usuario.tenantId;
    const file = (req.files || [])[0];
    if (!file) {
      return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
    }

    const catalogoTipos = await listarTipos({ tenantId, somenteAtivos: true });

    const r = await extrairLaudoCq({
      pdfBuffer: file.buffer,
      tenantId,
      catalogoTipos: catalogoTipos.map((t) => ({
        id: t.id, codigo: t.codigo, nome: t.nome, modalidade: t.modalidade,
      })),
    });

    if (!r.ok) {
      return res.status(422).json({ message: 'Falha ao extrair laudo.', erro: r.erro });
    }

    // Tenta casar com algum equipamento do tenant para pre-selecionar no form.
    // unidadeIdentificada do laudo (cliente) eh usada para filtrar o universo
    // — em tenants multi-site, "TC na unidade Cerdil Dourados" basta.
    const match = await matchEquipamento({
      tenantId,
      modelo:     r.dados.modeloIdentificado,
      serial:     r.dados.serialIdentificado,
      fabricante: r.dados.fabricanteIdentificado,
      modalidade: r.dados.modalidade,
      sala:       r.dados.salaIdentificada,
      unidadeIdentificada: r.dados.unidadeIdentificada,
    });

    // unidadeIdentificada e salaIdentificada sao internos (so para matching)
    // — nao retornar pro form pra nao poluir o cadastro
    const { unidadeIdentificada: _u, salaIdentificada: _s, ...dadosPublicos } = r.dados;

    return res.json({
      dados: dadosPublicos,
      alertas: r.alertas || [],
      equipamentoSugerido: match?.equipamento
        ? {
            id: match.equipamento.id,
            modelo: match.equipamento.modelo,
            tag: match.equipamento.tag,
            tipo: match.equipamento.tipo,
            fabricante: match.equipamento.fabricante,
          }
        : null,
      matchCriterio: match?.criterio || null,
    });
  } catch (e) {
    console.error('[CQ_EXTRAIR_LAUDO_ERROR]', e);
    return res.status(500).json({ message: 'Erro ao extrair laudo.' });
  }
});

// ─── Importacao em lote (admin) ─────────────────────────────────────────────

// Etapa 1: extrai N PDFs e devolve lista para revisao do usuario.
// Salva PDFs em R2 temp para serem referenciados na criacao final.
router.post('/importacao/extrair-lote', admin, uploadFor('controleQualidadeImport'), async (req, res) => {
  try {
    const r = await extrairLoteService({
      tenantId: req.usuario.tenantId,
      files: req.files || [],
    });
    if (!r.ok) return res.status(400).json({ message: r.erro });
    return res.json(r);
  } catch (e) {
    console.error('[CQ_IMPORT_EXTRAIR_ERROR]', e);
    return res.status(500).json({ message: 'Erro ao extrair lote.' });
  }
});

// Etapa 2: usuario revisou — cria os testes confirmados.
router.post('/importacao/criar-lote', admin, async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    const r = await criarLoteService({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      items,
    });
    if (!r.ok) return res.status(400).json({ message: r.erro });
    return res.json(r);
  } catch (e) {
    console.error('[CQ_IMPORT_CRIAR_ERROR]', e);
    return res.status(500).json({ message: 'Erro ao criar lote.' });
  }
});

// Cleanup: descarta R2 temp se usuario fechou a tela sem salvar
router.post('/importacao/descartar-lote', admin, async (req, res) => {
  try {
    const r = await descartarLoteService({ r2Keys: req.body?.r2Keys || [] });
    return res.json(r);
  } catch (e) {
    console.error('[CQ_IMPORT_DESCARTAR_ERROR]', e);
    return res.status(500).json({ message: 'Erro ao descartar lote.' });
  }
});

// ─── Anexos (laudos PDF) ────────────────────────────────────────────────────

router.post('/testes/:id/anexos', uploadFor('controleQualidade'), async (req, res, next) => {
  try {
    const tenantId = req.usuario.tenantId;
    const usuarioId = req.usuario.id;
    const testeId = req.params.id;

    await adicionarAnexos({
      resource: 'controleQualidade',
      tenantId,
      usuarioId,
      entityId: testeId,
      files: req.files,
    });

    const atualizado = await buscarTestePorId({ tenantId, testeId });

    const nomes = (req.files || []).map((f) => f.originalname).join(', ');
    if (nomes) {
      await registrarLog({
        tenantId,
        usuarioId,
        acao: 'UPLOAD',
        entidade: 'TesteQualidade',
        entidadeId: testeId,
        detalhes: `Laudo(s) anexado(s) ao teste ${atualizado?.tipoTeste?.codigo || testeId}: ${nomes}.`,
      });
    }

    return res.status(201).json(atualizado);
  } catch (e) {
    console.error('[CQ_ANEXO_UPLOAD_ERROR]', e);
    return next(e);
  }
});

router.delete('/testes/:id/anexos/:anexoId', async (req, res, next) => {
  try {
    const tenantId = req.usuario.tenantId;
    const usuarioId = req.usuario.id;
    const testeId = req.params.id;
    const anexoId = req.params.anexoId;

    const testeBefore = await buscarTestePorId({ tenantId, testeId });
    const anexoBefore = (testeBefore?.anexos || []).find((a) => a.id === anexoId);

    await removerAnexo({
      resource: 'controleQualidade',
      tenantId,
      usuarioId,
      entityId: testeId,
      anexoId,
    });

    await registrarLog({
      tenantId,
      usuarioId,
      acao: 'EXCLUSAO',
      entidade: 'TesteQualidade',
      entidadeId: testeId,
      detalhes: `Anexo removido do teste ${testeBefore?.tipoTeste?.codigo || testeId}: ${anexoBefore?.nomeOriginal || anexoId}.`,
    });

    return res.status(204).send();
  } catch (e) {
    console.error('[CQ_ANEXO_DELETE_ERROR]', e);
    if (e.status) return res.status(e.status).json({ message: e.message });
    return next(e);
  }
});

export default router;
