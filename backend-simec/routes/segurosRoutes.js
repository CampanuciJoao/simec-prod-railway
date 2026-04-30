// Ficheiro: routes/segurosRoutes.js
// Versão: Multi-tenant hardened + upload centralizado

import express from 'express';
import prisma from '../services/prismaService.js';
import { registrarLog } from '../services/logService.js';
import { proteger, admin } from '../middleware/authMiddleware.js';
import validate from '../middleware/validate.js';
import { seguroSchema } from '../validators/seguroValidator.js';
import { uploadFor } from '../middleware/uploadMiddleware.js';
import {
  adicionarAnexos,
  removerAnexo,
} from '../services/uploads/anexoService.js';
import {
  deleteStoredFile,
  getFromR2,
} from '../services/uploads/fileStorageService.js';

const router = express.Router();

router.use(proteger);

async function buscarSeguroCompleto(tenantId, id) {
  return prisma.seguro.findFirst({
    where: {
      id,
      tenantId,
    },
    include: {
      anexos: {
        orderBy: { createdAt: 'desc' },
      },
      equipamento: {
        select: { id: true, modelo: true, tag: true, tipo: true },
      },
      unidade: {
        select: { id: true, nomeSistema: true, nomeFantasia: true, cidade: true, estado: true },
      },
      seguroAnterior: {
        select: { id: true, apoliceNumero: true, status: true, dataInicio: true, dataFim: true },
      },
      renovacoes: {
        select: { id: true, apoliceNumero: true, status: true, dataInicio: true, dataFim: true },
        orderBy: { dataInicio: 'desc' },
      },
    },
  });
}

async function validarEquipamentoDoTenant(tenantId, equipamentoId) {
  if (!equipamentoId) return null;

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
    const error = new Error('Equipamento inválido.');
    error.status = 404;
    throw error;
  }

  return equipamento;
}

async function validarUnidadeDoTenant(tenantId, unidadeId) {
  if (!unidadeId) return null;

  const unidade = await prisma.unidade.findFirst({
    where: {
      id: unidadeId,
      tenantId,
    },
    select: {
      id: true,
      nomeSistema: true,
    },
  });

  if (!unidade) {
    const error = new Error('Unidade inválida.');
    error.status = 404;
    throw error;
  }

  return unidade;
}

async function verificarSobreposicaoCobertura(tenantId, { unidadeId, equipamentoId, dataInicio, dataFim, excluirId }) {
  const inicio = new Date(dataInicio);
  const fim    = new Date(dataFim);

  const alvos = [];
  if (unidadeId)     alvos.push({ campo: 'prédio',      where: { unidadeId } });
  if (equipamentoId) alvos.push({ campo: 'equipamento', where: { equipamentoId } });

  for (const { campo, where } of alvos) {
    const conflito = await prisma.seguro.findFirst({
      where: {
        tenantId,
        ...where,
        status: { in: ['Ativo', 'Vigente'] },
        id: excluirId ? { not: excluirId } : undefined,
        // Sobreposição real — toque de fronteira (renovação) é permitido
        dataInicio: { lt: fim },
        dataFim:    { gt: inicio },
      },
      select: { id: true, apoliceNumero: true },
    });

    if (conflito) {
      const error = new Error(
        `Já existe um seguro ativo cobrindo este ${campo} no mesmo período (Apólice ${conflito.apoliceNumero || conflito.id}).`
      );
      error.status = 409;
      throw error;
    }
  }
}

// ─── Helpers de paginação e filtros ──────────────────────────────────────────

function buildStatusWhereSeguro(status) {
  if (!status) return null;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const em30Dias = new Date(hoje);
  em30Dias.setDate(em30Dias.getDate() + 30);

  switch (status) {
    case 'Cancelado':
      return { status: 'Cancelado' };
    case 'Expirado':
      return { OR: [{ status: 'Expirado' }, { status: 'Ativo', dataFim: { lt: hoje } }] };
    case 'Vence em breve':
      return { status: { not: 'Cancelado' }, dataFim: { gte: hoje, lt: em30Dias } };
    case 'Ativo':
      return { status: { notIn: ['Cancelado', 'Expirado'] }, dataFim: { gte: em30Dias } };
    default:
      return null;
  }
}

function buildSeguroWhere({ tenantId, status, seguradora, unidade, tipoSeguro, search }) {
  const conditions = [{ tenantId }];

  const statusFilter = buildStatusWhereSeguro(status);
  if (statusFilter) conditions.push(statusFilter);
  if (seguradora) conditions.push({ seguradora });
  if (tipoSeguro) conditions.push({ tipoSeguro });
  if (unidade) conditions.push({ unidade: { nomeSistema: unidade } });

  if (search) {
    conditions.push({
      OR: [
        { apoliceNumero: { contains: search, mode: 'insensitive' } },
        { seguradora: { contains: search, mode: 'insensitive' } },
        { unidade: { nomeSistema: { contains: search, mode: 'insensitive' } } },
        { equipamento: { modelo: { contains: search, mode: 'insensitive' } } },
        { equipamento: { tag: { contains: search, mode: 'insensitive' } } },
      ],
    });
  }

  return conditions.length === 1 ? conditions[0] : { AND: conditions };
}

async function contarMetricasSeguros(tenantId) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const em30Dias = new Date(hoje);
  em30Dias.setDate(em30Dias.getDate() + 30);

  const [total, ativos, vencendo, vencidos] = await Promise.all([
    prisma.seguro.count({ where: { tenantId } }),
    prisma.seguro.count({
      where: {
        tenantId,
        status: { notIn: ['Cancelado', 'Expirado'] },
        dataFim: { gte: em30Dias },
      },
    }),
    prisma.seguro.count({
      where: {
        tenantId,
        status: { not: 'Cancelado' },
        dataFim: { gte: hoje, lt: em30Dias },
      },
    }),
    prisma.seguro.count({
      where: {
        tenantId,
        OR: [{ status: 'Expirado' }, { status: 'Ativo', dataFim: { lt: hoje } }],
      },
    }),
  ]);

  return { total, ativos, vencendo, vencidos };
}

const SEGURO_INCLUDE = {
  equipamento: {
    select: { id: true, modelo: true, tag: true, tipo: true },
  },
  unidade: {
    select: { id: true, nomeSistema: true, nomeFantasia: true },
  },
  anexos: {
    orderBy: { createdAt: 'desc' },
  },
};

// ==============================
// GET LISTAR (paginado)
// ==============================
router.get('/', async (req, res) => {
  try {
    const tenantId = req.usuario.tenantId;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize) || 15));
    const { status, seguradora, unidade, tipoSeguro, search } = req.query;

    const where = buildSeguroWhere({ tenantId, status, seguradora, unidade, tipoSeguro, search });

    const [data, total, metricas] = await Promise.all([
      prisma.seguro.findMany({
        where,
        include: SEGURO_INCLUDE,
        orderBy: { dataFim: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.seguro.count({ where }),
      contarMetricasSeguros(tenantId),
    ]);

    return res.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      metricas,
    });
  } catch (error) {
    console.error('[SEGURO_LIST_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao buscar seguros.' });
  }
});

// ==============================
// GET POR ID
// ==============================
router.get('/:id', async (req, res) => {
  try {
    const tenantId = req.usuario.tenantId;

    const seguro = await buscarSeguroCompleto(tenantId, req.params.id);

    if (!seguro) {
      return res.status(404).json({ message: 'Seguro não encontrado.' });
    }

    return res.json(seguro);
  } catch (error) {
    console.error('[SEGURO_GET_ERROR]', error);
    return res.status(500).json({
      message: 'Erro ao buscar detalhe do seguro.',
    });
  }
});

// ==============================
// POST CRIAR
// ==============================
router.post('/', validate(seguroSchema), async (req, res) => {
  const dados = req.validatedData || req.body;
  const { equipamentoId, unidadeId, veiculoId, dataInicio, dataFim, ...resto } = dados;

  try {
    const tenantId = req.usuario.tenantId;

    await validarEquipamentoDoTenant(tenantId, equipamentoId);
    await validarUnidadeDoTenant(tenantId, unidadeId);
    await verificarSobreposicaoCobertura(tenantId, { unidadeId, equipamentoId, dataInicio, dataFim, excluirId: null });

    const novoSeguro = await prisma.seguro.create({
      data: {
        ...resto,
        dataInicio: new Date(dataInicio),
        dataFim: new Date(dataFim),

        tenant: {
          connect: { id: tenantId },
        },

        equipamento: equipamentoId
          ? {
              connect: {
                tenantId_id: {
                  tenantId,
                  id: equipamentoId,
                },
              },
            }
          : undefined,

        unidade: unidadeId
          ? {
              connect: {
                tenantId_id: {
                  tenantId,
                  id: unidadeId,
                },
              },
            }
          : undefined,

        veiculo: veiculoId
          ? {
              connect: {
                tenantId_id: {
                  tenantId,
                  id: veiculoId,
                },
              },
            }
          : undefined,
      },
    });

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'CRIAÇÃO',
      entidade: 'Seguro',
      entidadeId: novoSeguro.id,
      detalhes: `Seguro nº ${novoSeguro.apoliceNumero} cadastrado.`,
    });

    const seguroCompleto = await buscarSeguroCompleto(tenantId, novoSeguro.id);

    return res.status(201).json(seguroCompleto || novoSeguro);
  } catch (error) {
    console.error('[SEGURO_CREATE_ERROR]', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'Este número de apólice já está cadastrado.',
      });
    }

    if (error.status) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    return res.status(500).json({ message: 'Erro ao criar seguro.' });
  }
});

// ==============================
// PUT EDITAR
// ==============================
router.put('/:id', validate(seguroSchema), async (req, res) => {
  const { id } = req.params;
  const dados = req.validatedData || req.body;
  const { equipamentoId, unidadeId, veiculoId, dataInicio, dataFim, ...resto } = dados;

  try {
    const tenantId = req.usuario.tenantId;

    const seguro = await prisma.seguro.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        apoliceNumero: true,
        equipamentoId: true,
        unidadeId: true,
        veiculoId: true,
      },
    });

    if (!seguro) {
      return res.status(404).json({ message: 'Seguro não encontrado.' });
    }

    await validarEquipamentoDoTenant(tenantId, equipamentoId);
    await validarUnidadeDoTenant(tenantId, unidadeId);
    await verificarSobreposicaoCobertura(tenantId, { unidadeId, equipamentoId, dataInicio, dataFim, excluirId: id });

    const atualizado = await prisma.seguro.update({
      where: {
        tenantId_id: { tenantId, id },
      },
      data: {
        ...resto,
        dataInicio: dataInicio ? new Date(dataInicio) : undefined,
        dataFim: dataFim ? new Date(dataFim) : undefined,

        equipamento: equipamentoId
          ? { connect: { tenantId_id: { tenantId, id: equipamentoId } } }
          : seguro.equipamentoId
            ? { disconnect: { tenantId_id: { tenantId, id: seguro.equipamentoId } } }
            : undefined,

        unidade: unidadeId
          ? { connect: { tenantId_id: { tenantId, id: unidadeId } } }
          : seguro.unidadeId
            ? { disconnect: { tenantId_id: { tenantId, id: seguro.unidadeId } } }
            : undefined,

        veiculo: veiculoId
          ? { connect: { tenantId_id: { tenantId, id: veiculoId } } }
          : seguro.veiculoId
            ? { disconnect: { tenantId_id: { tenantId, id: seguro.veiculoId } } }
            : undefined,
      },
    });

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'EDIÇÃO',
      entidade: 'Seguro',
      entidadeId: id,
      detalhes: `Seguro nº ${atualizado.apoliceNumero} atualizado.`,
    });

    const seguroCompleto = await buscarSeguroCompleto(tenantId, id);

    return res.json(seguroCompleto || atualizado);
  } catch (error) {
    console.error('[SEGURO_UPDATE_ERROR]', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'Este número de apólice já está cadastrado.',
      });
    }

    if (error.status) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    return res.status(500).json({ message: 'Erro ao atualizar seguro.' });
  }
});

// ==============================
// DELETE
// ==============================
router.delete('/:id', admin, async (req, res) => {
  const { id } = req.params;
  const tenantId = req.usuario.tenantId;

  try {
    const seguro = await prisma.seguro.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        anexos: true,
      },
    });

    if (!seguro) {
      return res.status(404).json({ message: 'Seguro não encontrado.' });
    }

    for (const anexo of seguro.anexos || []) {
      try {
        deleteStoredFile(anexo.path);
      } catch (fileError) {
        console.error(
          `[SEGURO_DELETE_FILE_ERROR] seguroId=${id} anexoId=${anexo.id}`,
          fileError
        );
      }
    }

    await prisma.seguro.delete({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
    });

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'EXCLUSÃO',
      entidade: 'Seguro',
      entidadeId: id,
      detalhes: `Seguro nº ${seguro.apoliceNumero} excluído.`,
    });

    return res.status(204).send();
  } catch (error) {
    console.error('[SEGURO_DELETE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao excluir seguro.' });
  }
});

// ==============================
// DOWNLOAD APÓLICE (primeiro anexo)
// ==============================
router.get('/:id/apolice', async (req, res) => {
  const { id } = req.params;
  const tenantId = req.usuario.tenantId;

  try {
    const seguro = await prisma.seguro.findFirst({
      where: { id, tenantId },
      select: {
        apoliceNumero: true,
        anexos: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { path: true },
        },
      },
    });

    if (!seguro) {
      return res.status(404).json({ message: 'Seguro não encontrado.' });
    }

    const anexo = seguro.anexos[0];
    if (!anexo) {
      return res.status(404).json({ message: 'Nenhum anexo cadastrado para este seguro.' });
    }

    const obj = await getFromR2(anexo.path);
    const filename = `apolice-${seguro.apoliceNumero || id}.pdf`;

    res.set('Content-Type', obj.ContentType || 'application/pdf');
    res.set('Content-Disposition', `attachment; filename="${filename}"`);
    obj.Body.pipe(res);
  } catch (error) {
    console.error('[SEGURO_DOWNLOAD_ERROR]', error);
    return res.status(404).json({ message: 'Arquivo não encontrado.' });
  }
});

// ==============================
// UPLOAD ANEXOS
// Campo multipart oficial do SIMEC: "file"
// ==============================
router.post('/:id/anexos', uploadFor('seguros'), async (req, res, next) => {
  try {
    const tenantId = req.usuario.tenantId;
    const usuarioId = req.usuario.id;
    const seguroId = req.params.id;

    await adicionarAnexos({
      resource: 'seguros',
      tenantId,
      usuarioId,
      entityId: seguroId,
      files: req.files,
    });

    const atualizado = await buscarSeguroCompleto(tenantId, seguroId);

    return res.status(201).json(atualizado);
  } catch (error) {
    console.error('[SEGURO_UPLOAD_ERROR]', error);
    return next(error);
  }
});

// ==============================
// DELETE ANEXO
// ==============================
router.delete('/:id/anexos/:anexoId', async (req, res, next) => {
  try {
    await removerAnexo({
      resource: 'seguros',
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      entityId: req.params.id,
      anexoId: req.params.anexoId,
    });

    return res.status(204).send();
  } catch (error) {
    console.error('[SEGURO_ANEXO_DELETE_ERROR]', error);

    if (error.status) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    return next(error);
  }
});

// ==============================
// POST CANCELAR
// Cancela um seguro ativo registrando o motivo no histórico de auditoria.
// Não remove o registro — fica acessível via GET /seguros/:id/historico.
// ==============================
router.post('/:id/cancelar', async (req, res) => {
  const { id } = req.params;
  const { motivo } = req.body;
  const tenantId = req.usuario.tenantId;

  try {
    const seguro = await prisma.seguro.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        status: true,
        apoliceNumero: true,
        unidade: { select: { nomeSistema: true } },
        equipamento: { select: { modelo: true } },
      },
    });

    if (!seguro) {
      return res.status(404).json({ message: 'Seguro não encontrado.' });
    }
    if (seguro.status === 'Cancelado') {
      return res.status(409).json({ message: 'Este seguro já está cancelado.' });
    }
    if (seguro.status === 'Substituido') {
      return res.status(409).json({ message: 'Seguros substituídos por renovação não podem ser cancelados.' });
    }

    await prisma.seguro.update({
      where: { tenantId_id: { tenantId, id } },
      data: {
        status: 'Cancelado',
        motivoCancelamento: motivo?.trim() || null,
      },
    });

    const alvoDesc = seguro.unidade?.nomeSistema
      ? `unidade ${seguro.unidade.nomeSistema}`
      : seguro.equipamento?.modelo
        ? `equipamento ${seguro.equipamento.modelo}`
        : `apólice ${seguro.apoliceNumero}`;

    const dataFormatada = new Date().toLocaleDateString('pt-BR');
    const motivoLog = motivo?.trim() ? ` Motivo: ${motivo.trim()}.` : '';

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'CANCELAMENTO',
      entidade: 'Seguro',
      entidadeId: id,
      detalhes: `Apólice ${seguro.apoliceNumero} (${alvoDesc}) cancelada em ${dataFormatada}.${motivoLog}`,
    });

    const seguroAtualizado = await buscarSeguroCompleto(tenantId, id);
    return res.json(seguroAtualizado);
  } catch (error) {
    console.error('[SEGURO_CANCELAR_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao cancelar seguro.' });
  }
});

// ==============================
// POST RENOVAR
// Cria nova apólice, registra histórico dos anexos anteriores e marca o seguro
// antigo como Substituido — operação atômica via transaction.
// ==============================
router.post('/:id/renovar', validate(seguroSchema), async (req, res) => {
  const { id } = req.params;
  const dados = req.validatedData || req.body;
  const { equipamentoId, unidadeId, veiculoId, dataInicio, dataFim, ...resto } = dados;

  try {
    const tenantId = req.usuario.tenantId;

    const seguroAntigo = await prisma.seguro.findFirst({
      where: { id, tenantId },
      include: {
        anexos: { select: { id: true, path: true, nomeOriginal: true } },
        unidade: { select: { nomeSistema: true } },
        equipamento: { select: { modelo: true, tag: true } },
      },
    });

    if (!seguroAntigo) {
      return res.status(404).json({ message: 'Seguro não encontrado.' });
    }
    if (!['Ativo', 'Vigente'].includes(seguroAntigo.status)) {
      return res.status(409).json({ message: 'Apenas seguros ativos podem ser renovados.' });
    }

    await validarEquipamentoDoTenant(tenantId, equipamentoId);
    await validarUnidadeDoTenant(tenantId, unidadeId);
    await verificarSobreposicaoCobertura(tenantId, { unidadeId, equipamentoId, dataInicio, dataFim, excluirId: id });

    const alvoDesc = seguroAntigo.unidade?.nomeSistema
      ? `unidade ${seguroAntigo.unidade.nomeSistema}`
      : seguroAntigo.equipamento?.modelo
        ? `equipamento ${seguroAntigo.equipamento.modelo}`
        : `apólice ${seguroAntigo.apoliceNumero}`;

    const anexosAntigos = seguroAntigo.anexos
      .map((a) => a.nomeOriginal || a.path)
      .join(', ') || 'nenhum';

    const novoSeguro = await prisma.$transaction(async (tx) => {
      const criado = await tx.seguro.create({
        data: {
          ...resto,
          dataInicio: new Date(dataInicio),
          dataFim: new Date(dataFim),
          seguroAnteriorId: id,
          tenant: { connect: { id: tenantId } },
          equipamento: equipamentoId
            ? { connect: { tenantId_id: { tenantId, id: equipamentoId } } }
            : undefined,
          unidade: unidadeId
            ? { connect: { tenantId_id: { tenantId, id: unidadeId } } }
            : undefined,
          veiculo: veiculoId
            ? { connect: { tenantId_id: { tenantId, id: veiculoId } } }
            : undefined,
        },
      });

      await tx.seguro.update({
        where: { tenantId_id: { tenantId, id } },
        data: { status: 'Substituido' },
      });

      return criado;
    });

    const dataRenovacao = new Date().toLocaleDateString('pt-BR');

    await Promise.all([
      registrarLog({
        tenantId,
        usuarioId: req.usuario.id,
        acao: 'RENOVAÇÃO',
        entidade: 'Seguro',
        entidadeId: id,
        detalhes: `Apólice ${seguroAntigo.apoliceNumero} (${alvoDesc}) substituída pela apólice ${novoSeguro.apoliceNumero} em ${dataRenovacao}. Documentos anteriores: ${anexosAntigos}.`,
      }),
      registrarLog({
        tenantId,
        usuarioId: req.usuario.id,
        acao: 'CRIAÇÃO',
        entidade: 'Seguro',
        entidadeId: novoSeguro.id,
        detalhes: `Apólice ${novoSeguro.apoliceNumero} criada como renovação da apólice ${seguroAntigo.apoliceNumero} em ${dataRenovacao}.`,
      }),
    ]);

    const seguroCompleto = await buscarSeguroCompleto(tenantId, novoSeguro.id);
    return res.status(201).json(seguroCompleto || novoSeguro);
  } catch (error) {
    console.error('[SEGURO_RENOVAR_ERROR]', error);

    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Este número de apólice já está cadastrado.' });
    }
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Erro ao renovar seguro.' });
  }
});

// ==============================
// GET HISTÓRICO DE RENOVAÇÕES
// Retorna a cadeia completa de apólices anteriores a partir de qualquer seguro.
// ==============================
router.get('/:id/historico', async (req, res) => {
  const { id } = req.params;
  const tenantId = req.usuario.tenantId;

  try {
    const cadeia = [];
    let seguroAtualId = id;

    // Percorre a cadeia de renovações via seguroAnteriorId
    while (seguroAtualId) {
      const seguro = await prisma.seguro.findFirst({
        where: { id: seguroAtualId, tenantId },
        select: {
          id: true,
          apoliceNumero: true,
          seguradora: true,
          dataInicio: true,
          dataFim: true,
          status: true,
          premioTotal: true,
          seguroAnteriorId: true,
          cobertura: true,
          unidade: { select: { id: true, nomeSistema: true } },
          equipamento: { select: { id: true, modelo: true, tag: true } },
          anexos: { select: { id: true, nomeOriginal: true, path: true, createdAt: true }, orderBy: { createdAt: 'desc' } },
        },
      });

      if (!seguro) break;

      cadeia.push(seguro);
      seguroAtualId = seguro.seguroAnteriorId;
    }

    return res.json(cadeia);
  } catch (error) {
    console.error('[SEGURO_HISTORICO_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao buscar histórico do seguro.' });
  }
});

export default router;