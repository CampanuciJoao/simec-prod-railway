// Ficheiro: routes/ocorrenciasRoutes.js
// Versão: Multi-tenant hardened + event log operacional

import express from 'express';
import prisma from '../services/prismaService.js';
import { proteger } from '../middleware/authMiddleware.js';
import { registrarLog } from '../services/logService.js';

const router = express.Router();

router.use(proteger);

const TIPOS_OCORRENCIA_VALIDOS = [
  'Operacional',
  'Falha',
  'Ajuste',
  'Manutencao',
  'Inspecao',
  'Observacao',
];

const ORIGENS_VALIDAS = ['usuario', 'agente', 'sistema'];
const GRAVIDADES_VALIDAS = ['baixa', 'media', 'alta'];

function normalizarTexto(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizarTipo(tipo) {
  const valor = normalizarTexto(tipo);
  if (!valor) return null;

  const match = TIPOS_OCORRENCIA_VALIDOS.find(
    (item) => item.toLowerCase() === valor.toLowerCase()
  );

  return match || null;
}

function normalizarOrigem(origem) {
  const valor = normalizarTexto(origem)?.toLowerCase();
  if (!valor) return 'usuario';
  return ORIGENS_VALIDAS.includes(valor) ? valor : null;
}

function normalizarGravidade(gravidade) {
  const valor = normalizarTexto(gravidade)?.toLowerCase();
  if (!valor) return 'media';
  return GRAVIDADES_VALIDAS.includes(valor) ? valor : null;
}

function normalizarMetadata(metadata) {
  if (metadata === undefined || metadata === null || metadata === '') {
    return null;
  }

  if (typeof metadata === 'object' && !Array.isArray(metadata)) {
    return metadata;
  }

  return null;
}

// ==============================
// POST CRIAR EVENTO / OCORRÊNCIA
// ==============================
router.post('/', async (req, res) => {
  const {
    equipamentoId,
    titulo,
    descricao,
    tipo,
    tecnico,
    origem,
    gravidade,
    metadata,
  } = req.body;

  if (!equipamentoId || !titulo || !tipo) {
    return res.status(400).json({
      message: 'equipamentoId, titulo e tipo são obrigatórios.',
    });
  }

  const tipoNormalizado = normalizarTipo(tipo);
  if (!tipoNormalizado) {
    return res.status(400).json({
      message: `Tipo inválido. Use um dos valores: ${TIPOS_OCORRENCIA_VALIDOS.join(', ')}.`,
    });
  }

  const origemNormalizada = normalizarOrigem(origem);
  if (!origemNormalizada) {
    return res.status(400).json({
      message: `Origem inválida. Use: ${ORIGENS_VALIDAS.join(', ')}.`,
    });
  }

  const gravidadeNormalizada = normalizarGravidade(gravidade);
  if (!gravidadeNormalizada) {
    return res.status(400).json({
      message: `Gravidade inválida. Use: ${GRAVIDADES_VALIDAS.join(', ')}.`,
    });
  }

  const metadataNormalizada = normalizarMetadata(metadata);
  if (metadata !== undefined && metadata !== null && !metadataNormalizada) {
    return res.status(400).json({
      message: 'metadata deve ser um objeto JSON válido.',
    });
  }

  try {
    const tenantId = req.usuario.tenantId;

    const equipamento = await prisma.equipamento.findFirst({
      where: {
        id: equipamentoId,
        tenantId,
      },
      select: {
        id: true,
        modelo: true,
        tag: true,
      },
    });

    if (!equipamento) {
      return res.status(404).json({
        message: 'Equipamento não encontrado.',
      });
    }

    const nova = await prisma.ocorrencia.create({
      data: {
        titulo: String(titulo).trim(),
        descricao: normalizarTexto(descricao),
        tipo: tipoNormalizado,
        origem: origemNormalizada,
        gravidade: gravidadeNormalizada,
        metadata: metadataNormalizada,
        tecnico: normalizarTexto(tecnico),

        tenant: {
          connect: {
            id: tenantId,
          },
        },

        equipamento: {
          connect: {
            tenantId_id: {
              tenantId,
              id: equipamentoId,
            },
          },
        },
      },
    });

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'CRIAÇÃO',
      entidade: 'Ocorrência',
      entidadeId: nova.id,
      detalhes: `Evento "${nova.titulo}" (${nova.tipo}, gravidade ${nova.gravidade}, origem ${nova.origem}) criado para o equipamento ${equipamento.modelo} (${equipamento.tag}).`,
    });

    return res.status(201).json(nova);
  } catch (error) {
    console.error('[OCORRENCIA_CREATE_ERROR]', error);
    return res.status(500).json({
      message: 'Erro ao registrar evento do equipamento.',
    });
  }
});

// ==============================
// PUT RESOLVER OCORRÊNCIA
// ==============================
router.put('/:id/resolver', async (req, res) => {
  const { id } = req.params;
  const { solucao, tecnicoResolucao } = req.body;

  if (!solucao || typeof solucao !== 'string' || !solucao.trim()) {
    return res.status(400).json({
      message: 'A solução é obrigatória para resolver a ocorrência.',
    });
  }

  try {
    const tenantId = req.usuario.tenantId;

    const ocorrencia = await prisma.ocorrencia.findFirst({
      where: {
        id,
        tenantId,
      },
      select: {
        id: true,
        titulo: true,
        resolvido: true,
      },
    });

    if (!ocorrencia) {
      return res.status(404).json({
        message: 'Ocorrência não encontrada.',
      });
    }

    if (ocorrencia.resolvido) {
      return res.status(400).json({
        message: 'Esta ocorrência já foi resolvida.',
      });
    }

    const atualizada = await prisma.ocorrencia.update({
      where: {
        id,
      },
      data: {
        resolvido: true,
        solucao: String(solucao).trim(),
        tecnicoResolucao: normalizarTexto(tecnicoResolucao),
        dataResolucao: new Date(),
      },
    });

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'EDIÇÃO',
      entidade: 'Ocorrência',
      entidadeId: id,
      detalhes: `Evento "${ocorrencia.titulo}" marcado como resolvido.`,
    });

    return res.json(atualizada);
  } catch (error) {
    console.error('[OCORRENCIA_RESOLVE_ERROR]', error);
    return res.status(500).json({
      message: 'Erro ao registrar solução do evento.',
    });
  }
});

// ==============================
// GET HISTÓRICO POR EQUIPAMENTO
// ==============================
router.get('/equipamento/:id', async (req, res) => {
  const equipamentoId = req.params.id;

  try {
    const tenantId = req.usuario.tenantId;

    const equipamento = await prisma.equipamento.findFirst({
      where: {
        id: equipamentoId,
        tenantId,
      },
      select: {
        id: true,
      },
    });

    if (!equipamento) {
      return res.status(404).json({
        message: 'Equipamento não encontrado.',
      });
    }

    const lista = await prisma.ocorrencia.findMany({
      where: {
        tenantId,
        equipamentoId,
      },
      orderBy: {
        data: 'desc',
      },
    });

    return res.json(lista);
  } catch (error) {
    console.error('[OCORRENCIA_LIST_ERROR]', error);
    return res.status(500).json({
      message: 'Erro ao buscar histórico técnico do equipamento.',
    });
  }
});

export default router;