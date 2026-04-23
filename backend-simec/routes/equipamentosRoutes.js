// Ficheiro: routes/equipamentosRoutes.js
// Versão: Multi-tenant hardened + upload centralizado

import express from 'express';
import prisma from '../services/prismaService.js';
import { registrarLog } from '../services/logService.js';
import { proteger, admin } from '../middleware/authMiddleware.js';
import validate from '../middleware/validate.js';
import {
  equipamentoSchema,
  equipamentoUpdateSchema,
} from '../validators/equipamentoValidator.js';
import { uploadFor } from '../middleware/uploadMiddleware.js';
import {
  adicionarAnexos,
  removerAnexo,
} from '../services/uploads/anexoService.js';
import { deleteStoredFile } from '../services/uploads/fileStorageService.js';
import {
  exportarHistoricoAtivoPorEquipamento,
  listarHistoricoAtivoPorEquipamento,
  registrarEventoHistoricoAtivo,
} from '../services/historicoAtivoService.js';

const router = express.Router();

router.use(proteger);

function parseDate(date) {
  return date ? new Date(date) : null;
}

function normalizarTextoOpcional(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function buildEquipamentosWhereClause(tenantId, query = {}) {
  const where = {
    tenantId,
  };

  const status = normalizarTextoOpcional(query?.status);
  const tipo = normalizarTextoOpcional(query?.tipo);
  const fabricante = normalizarTextoOpcional(query?.fabricante);
  const unidadeId = normalizarTextoOpcional(query?.unidadeId);
  const search = normalizarTextoOpcional(query?.search);

  if (status) where.status = status;
  if (tipo) where.tipo = tipo;
  if (fabricante) where.fabricante = fabricante;
  if (unidadeId) where.unidadeId = unidadeId;

  if (search) {
    where.OR = [
      {
        modelo: {
          contains: search,
          mode: 'insensitive',
        },
      },
      {
        tag: {
          contains: search,
          mode: 'insensitive',
        },
      },
      {
        aeTitle: {
          contains: search,
          mode: 'insensitive',
        },
      },
      {
        unidade: {
          is: {
            nomeSistema: {
              contains: search,
              mode: 'insensitive',
            },
          },
        },
      },
    ];
  }

  return where;
}

function buildEquipamentosOrderBy(sortBy, sortDirection) {
  const direction = sortDirection === 'desc' ? 'desc' : 'asc';

  if (sortBy === 'unidade') {
    return {
      unidade: {
        nomeSistema: direction,
      },
    };
  }

  const sortableFields = new Set([
    'modelo',
    'tag',
    'tipo',
    'fabricante',
    'status',
    'dataInstalacao',
    'createdAt',
    'anoFabricacao',
  ]);

  return sortableFields.has(sortBy)
    ? { [sortBy]: direction }
    : { modelo: 'asc' };
}

function agruparAnexosPorEquipamento(anexos = []) {
  return anexos.reduce((acc, anexo) => {
    if (!anexo?.equipamentoId) {
      return acc;
    }

    if (!acc[anexo.equipamentoId]) {
      acc[anexo.equipamentoId] = [];
    }

    acc[anexo.equipamentoId].push(anexo);
    return acc;
  }, {});
}

function isSameDateValue(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return new Date(a).getTime() === new Date(b).getTime();
}

function montarDescricaoInstalacao({
  equipamento,
  unidadeNome,
  dataInstalacao,
}) {
  const partes = [
    `Ativo ${equipamento.modelo} (${equipamento.tag}) vinculado a unidade ${unidadeNome}.`,
  ];

  if (dataInstalacao) {
    partes.push(`Data de instalacao informada: ${dataInstalacao}.`);
  }

  return partes.join(' ');
}

function coletarCamposAlterados(anterior, proximo) {
  const alterados = [];

  const camposTexto = [
    ['tag', 'TAG'],
    ['modelo', 'Modelo'],
    ['tipo', 'Tipo'],
    ['setor', 'Setor'],
    ['fabricante', 'Fabricante'],
    ['anoFabricacao', 'Ano de fabricacao'],
    ['numeroPatrimonio', 'Numero de patrimonio'],
    ['registroAnvisa', 'Registro Anvisa'],
    ['aeTitle', 'AE Title'],
    ['telefoneSuporte', 'Telefone de suporte'],
    ['observacoes', 'Observacoes'],
  ];

  for (const [campo, label] of camposTexto) {
    if (String(anterior?.[campo] || '') !== String(proximo?.[campo] || '')) {
      alterados.push(label);
    }
  }

  if (!isSameDateValue(anterior?.dataInstalacao, proximo?.dataInstalacao)) {
    alterados.push('Data de instalacao');
  }

  return alterados;
}

function montarDescricaoAlteracaoCadastral(camposAlterados = []) {
  if (!camposAlterados.length) {
    return 'Cadastro do equipamento atualizado.';
  }

  return `Cadastro do equipamento atualizado. Campos alterados: ${camposAlterados.join(', ')}.`;
}

async function buscarEquipamentoCompleto(tenantId, id) {
  return prisma.equipamento.findFirst({
    where: {
      id,
      tenantId,
    },
    include: {
      unidade: true,
      acessorios: {
        orderBy: {
          nome: 'asc',
        },
      },
      anexos: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  });
}

async function validarUnidadeDoTenant(tenantId, unidadeId) {
  if (!unidadeId) {
    const error = new Error('Unidade inválida.');
    error.status = 404;
    throw error;
  }

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

async function validarPatrimonioUnico({
  tenantId,
  numeroPatrimonio,
  equipamentoIdIgnorar = null,
}) {
  const patrimonio = numeroPatrimonio?.trim();

  if (!patrimonio || patrimonio.toLowerCase() === 'sem patrimônio') {
    return;
  }

  const existente = await prisma.equipamento.findFirst({
    where: {
      tenantId,
      numeroPatrimonio: {
        equals: patrimonio,
        mode: 'insensitive',
      },
      ...(equipamentoIdIgnorar
        ? {
            id: {
              not: equipamentoIdIgnorar,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  });

  if (existente) {
    const error = new Error(`Patrimônio "${patrimonio}" já existe.`);
    error.status = 400;
    throw error;
  }
}

// ==============================
// GET LISTAR
// ==============================
router.get('/', async (req, res) => {
  try {
    const tenantId = req.usuario.tenantId;
    const page = parsePositiveInt(req.query?.page, 1);
    const pageSize = Math.min(parsePositiveInt(req.query?.pageSize, 20), 500);
    const skip = (page - 1) * pageSize;
    const where = buildEquipamentosWhereClause(tenantId, req.query);
    const sortBy = normalizarTextoOpcional(req.query?.sortBy) || 'modelo';
    const sortDirection =
      normalizarTextoOpcional(req.query?.sortDirection) || 'asc';

    const [rawItems, total, statusSummary, tipos, fabricantes] =
      await Promise.all([
        prisma.equipamento.findMany({
          where,
          select: {
            id: true,
            tenantId: true,
            tag: true,
            modelo: true,
            tipo: true,
            setor: true,
            fabricante: true,
            anoFabricacao: true,
            dataInstalacao: true,
            status: true,
            numeroPatrimonio: true,
            registroAnvisa: true,
            aeTitle: true,
            telefoneSuporte: true,
            observacoes: true,
            unidadeId: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: buildEquipamentosOrderBy(sortBy, sortDirection),
          take: pageSize,
          skip,
        }),
        prisma.equipamento.count({ where }),
        prisma.equipamento.groupBy({
          by: ['status'],
          where,
          _count: {
            id: true,
          },
        }),
        prisma.equipamento.findMany({
          where: {
            tenantId,
            tipo: {
              not: null,
            },
          },
          distinct: ['tipo'],
          select: {
            tipo: true,
          },
          orderBy: {
            tipo: 'asc',
          },
        }),
        prisma.equipamento.findMany({
          where: {
            tenantId,
            fabricante: {
              not: null,
            },
          },
          distinct: ['fabricante'],
          select: {
            fabricante: true,
          },
          orderBy: {
            fabricante: 'asc',
          },
        }),
      ]);

    const unidadeIds = [
      ...new Set(rawItems.map((item) => item.unidadeId).filter(Boolean)),
    ];
    const equipamentoIds = rawItems.map((item) => item.id).filter(Boolean);

    const [unidades, anexos] = await Promise.all([
      unidadeIds.length > 0
        ? prisma.unidade.findMany({
            where: {
              tenantId,
              id: {
                in: unidadeIds,
              },
            },
            select: {
              id: true,
              nomeSistema: true,
            },
          })
        : [],
      equipamentoIds.length > 0
        ? prisma.anexo.findMany({
            where: {
              tenantId,
              equipamentoId: {
                in: equipamentoIds,
              },
            },
            select: {
              id: true,
              equipamentoId: true,
              nomeOriginal: true,
              path: true,
              tipoMime: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
          })
        : [],
    ]);

    const unidadeMap = new Map(unidades.map((unidade) => [unidade.id, unidade]));
    const anexosPorEquipamento = agruparAnexosPorEquipamento(anexos);
    const items = rawItems.map((item) => ({
      ...item,
      unidade: unidadeMap.get(item.unidadeId) || null,
      anexos: anexosPorEquipamento[item.id] || [],
    }));

    const metricas = statusSummary.reduce(
      (acc, item) => {
        acc.total = total;
        if (item.status === 'Operante') acc.operantes = item._count.id;
        if (item.status === 'EmManutencao') acc.emManutencao = item._count.id;
        if (item.status === 'Inoperante') acc.inoperantes = item._count.id;
        if (item.status === 'UsoLimitado') acc.usoLimitado = item._count.id;
        return acc;
      },
      {
        total,
        operantes: 0,
        emManutencao: 0,
        inoperantes: 0,
        usoLimitado: 0,
      }
    );

    return res.json({
      items,
      total,
      page,
      pageSize,
      hasNextPage: skip + items.length < total,
      filters: {
        tipos: tipos
          .map((item) => item.tipo)
          .filter(Boolean),
        fabricantes: fabricantes
          .map((item) => item.fabricante)
          .filter(Boolean),
      },
      metricas,
    });
  } catch (error) {
    console.error('[EQUIP_LIST_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao buscar equipamentos.' });
  }
});

// ==============================
// GET POR ID
// ==============================
router.get('/:id', async (req, res) => {
  try {
    const equipamento = await buscarEquipamentoCompleto(
      req.usuario.tenantId,
      req.params.id
    );

    if (!equipamento) {
      return res.status(404).json({ message: 'Equipamento não encontrado.' });
    }

    return res.json(equipamento);
  } catch (error) {
    console.error('[EQUIP_GET_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao buscar equipamento.' });
  }
});

router.get('/:id/historico', async (req, res) => {
  try {
    const tenantId = req.usuario.tenantId;
    const equipamentoId = req.params.id;
    const categoria = normalizarTextoOpcional(req.query?.categoria);
    const subcategoria = normalizarTextoOpcional(req.query?.subcategoria);
    const dataInicio = normalizarTextoOpcional(req.query?.dataInicio);
    const dataFim = normalizarTextoOpcional(req.query?.dataFim);
    const limit = req.query?.limit;
    const offset = req.query?.offset;

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
      return res.status(404).json({ message: 'Equipamento nao encontrado.' });
    }

    const historico = await listarHistoricoAtivoPorEquipamento({
      tenantId,
      equipamentoId,
      categoria,
      subcategoria,
      dataInicio,
      dataFim,
      limit,
      offset,
    });

    return res.json(historico);
  } catch (error) {
    console.error('[EQUIP_HISTORICO_GET_ERROR]', error);
    return res.status(500).json({
      message: 'Erro ao buscar historico do equipamento.',
    });
  }
});

router.get('/:id/historico/exportar', async (req, res) => {
  try {
    const tenantId = req.usuario.tenantId;
    const equipamentoId = req.params.id;
    const categoria = normalizarTextoOpcional(req.query?.categoria);
    const subcategoria = normalizarTextoOpcional(req.query?.subcategoria);
    const dataInicio = normalizarTextoOpcional(req.query?.dataInicio);
    const dataFim = normalizarTextoOpcional(req.query?.dataFim);

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
      return res.status(404).json({ message: 'Equipamento nao encontrado.' });
    }

    const historico = await exportarHistoricoAtivoPorEquipamento({
      tenantId,
      equipamentoId,
      categoria,
      subcategoria,
      dataInicio,
      dataFim,
    });

    return res.json(historico);
  } catch (error) {
    console.error('[EQUIP_HISTORICO_EXPORT_ERROR]', error);
    return res.status(500).json({
      message: 'Erro ao exportar historico do equipamento.',
    });
  }
});

// ==============================
// PATCH / DELETE HISTORICO (admin)
// ==============================
router.patch('/:id/historico/:eventoId', admin, async (req, res) => {
  const { id, eventoId } = req.params;
  const tenantId = req.usuario.tenantId;
  const { titulo, descricao } = req.body;

  try {
    const evento = await prisma.historicoAtivoEvento.findFirst({
      where: { id: eventoId, equipamentoId: id, tenantId },
    });

    if (!evento) {
      return res.status(404).json({ message: 'Registro de historico nao encontrado.' });
    }

    const atualizado = await prisma.historicoAtivoEvento.update({
      where: { id: eventoId },
      data: {
        ...(titulo !== undefined ? { titulo: String(titulo).trim() } : {}),
        ...(descricao !== undefined ? { descricao: String(descricao).trim() } : {}),
      },
    });

    return res.json(atualizado);
  } catch (error) {
    console.error('[EQUIP_HISTORICO_PATCH_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao editar registro de historico.' });
  }
});

router.delete('/:id/historico/:eventoId', admin, async (req, res) => {
  const { id, eventoId } = req.params;
  const tenantId = req.usuario.tenantId;

  try {
    const evento = await prisma.historicoAtivoEvento.findFirst({
      where: { id: eventoId, equipamentoId: id, tenantId },
    });

    if (!evento) {
      return res.status(404).json({ message: 'Registro de historico nao encontrado.' });
    }

    await prisma.historicoAtivoEvento.delete({ where: { id: eventoId } });

    return res.json({ message: 'Registro excluido com sucesso.' });
  } catch (error) {
    console.error('[EQUIP_HISTORICO_DELETE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao excluir registro de historico.' });
  }
});

// ==============================
// POST CRIAR
// ==============================
router.post('/', validate(equipamentoSchema), async (req, res) => {
  const dados = req.validatedData || req.body;
  const { dataInstalacao, unidadeId, ...restante } = dados;

  try {
    const tenantId = req.usuario.tenantId;

    const unidade = await validarUnidadeDoTenant(tenantId, unidadeId);
    await validarPatrimonioUnico({
      tenantId,
      numeroPatrimonio: restante.numeroPatrimonio,
    });

    const novo = await prisma.equipamento.create({
      data: {
        ...restante,
        dataInstalacao: parseDate(dataInstalacao),

        tenant: {
          connect: {
            id: tenantId,
          },
        },

        unidade: {
          connect: {
            tenantId_id: {
              tenantId,
              id: unidadeId,
            },
          },
        },
      },
    });

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'CRIAÇÃO',
      entidade: 'Equipamento',
      entidadeId: novo.id,
      detalhes: `Equipamento "${novo.modelo}" criado.`,
    });

    await registrarEventoHistoricoAtivo({
      tenantId,
      equipamentoId: novo.id,
      tipoEvento: 'equipamento_criado',
      categoria: dataInstalacao ? 'instalacao' : 'alteracao_cadastral',
      subcategoria: dataInstalacao ? 'instalacao_inicial' : 'criacao_ativo',
      titulo: dataInstalacao
        ? 'Instalacao inicial registrada'
        : 'Ativo cadastrado no sistema',
      descricao: montarDescricaoInstalacao({
        equipamento: novo,
        unidadeNome: unidade.nomeSistema,
        dataInstalacao,
      }),
      origem: 'sistema',
      status: novo.status,
      impactaAnalise: false,
      referenciaId: novo.id,
      referenciaTipo: 'equipamento',
      metadata: {
        modelo: novo.modelo,
        tag: novo.tag,
        unidadeId,
        unidadeNome: unidade.nomeSistema,
        dataInstalacao: dataInstalacao || null,
      },
      dataEvento: parseDate(dataInstalacao) || novo.createdAt,
    });

    const equipamentoCompleto = await buscarEquipamentoCompleto(tenantId, novo.id);

    return res.status(201).json(equipamentoCompleto || novo);
  } catch (error) {
    console.error('[EQUIP_CREATE_ERROR]', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'Já existe um equipamento com esse identificador único.',
      });
    }

    if (error.status) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    return res.status(500).json({ message: 'Erro ao criar equipamento.' });
  }
});

// ==============================
// PUT EDITAR
// ==============================
router.put('/:id', validate(equipamentoUpdateSchema), async (req, res) => {
  const { id } = req.params;
  const dados = req.validatedData || req.body;
  const motivoDesativacao = typeof req.body.motivoDesativacao === 'string'
    ? req.body.motivoDesativacao.trim() || null
    : null;
  const { dataInstalacao, unidadeId, ...restante } = dados;

  try {
    const tenantId = req.usuario.tenantId;

    const equipamento = await prisma.equipamento.findFirst({
      where: {
        id,
        tenantId,
      },
      select: {
        id: true,
        modelo: true,
        tag: true,
        tipo: true,
        setor: true,
        fabricante: true,
        anoFabricacao: true,
        numeroPatrimonio: true,
        registroAnvisa: true,
        aeTitle: true,
        telefoneSuporte: true,
        observacoes: true,
        dataInstalacao: true,
        status: true,
        unidadeId: true,
        unidade: {
          select: {
            id: true,
            nomeSistema: true,
          },
        },
      },
    });

    if (!equipamento) {
      return res.status(404).json({ message: 'Equipamento não encontrado.' });
    }

    const unidadeDestino = unidadeId
      ? await validarUnidadeDoTenant(tenantId, unidadeId)
      : null;

    await validarPatrimonioUnico({
      tenantId,
      numeroPatrimonio: restante.numeroPatrimonio,
      equipamentoIdIgnorar: id,
    });

    const dataUpdate = {
      ...restante,
      dataInstalacao: parseDate(dataInstalacao),
    };

    if (unidadeId) {
      dataUpdate.unidade = {
        connect: {
          tenantId_id: {
            tenantId,
            id: unidadeId,
          },
        },
      };
    }

    const atualizado = await prisma.equipamento.update({
      where: {
        tenantId_id: {
          tenantId,
          id,
        },
      },
      data: dataUpdate,
    });

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'EDIÇÃO',
      entidade: 'Equipamento',
      entidadeId: id,
      detalhes: `Equipamento "${atualizado.modelo}" atualizado.`,
    });

    const proximoEstado = {
      ...equipamento,
      ...restante,
      dataInstalacao: parseDate(dataInstalacao),
    };
    const camposAlterados = coletarCamposAlterados(equipamento, proximoEstado);

    if (unidadeId && unidadeId !== equipamento.unidadeId) {
      await registrarEventoHistoricoAtivo({
        tenantId,
        equipamentoId: id,
        tipoEvento: 'transferencia_unidade',
        categoria: 'transferencia_unidade',
        subcategoria: 'mudanca_unidade',
        titulo: 'Transferencia de unidade registrada',
        descricao: `Ativo transferido da unidade ${equipamento.unidade?.nomeSistema || 'N/A'} para ${unidadeDestino?.nomeSistema || 'N/A'}.`,
        origem: 'usuario',
        status: atualizado.status,
        impactaAnalise: false,
        referenciaId: id,
        referenciaTipo: 'equipamento',
        metadata: {
          unidadeOrigemId: equipamento.unidadeId,
          unidadeOrigemNome: equipamento.unidade?.nomeSistema || null,
          unidadeDestinoId: unidadeId,
          unidadeDestinoNome: unidadeDestino?.nomeSistema || null,
        },
      });
    }

    if (restante.status && restante.status !== equipamento.status) {
      const isDesativando = restante.status === 'Desativado';

      await registrarEventoHistoricoAtivo({
        tenantId,
        equipamentoId: id,
        tipoEvento: isDesativando ? 'equipamento_desativado' : 'status_operacional_atualizado',
        categoria: 'status_operacional',
        subcategoria: isDesativando ? 'desativacao' : 'mudanca_status',
        titulo: isDesativando ? 'Equipamento desativado' : 'Status operacional atualizado',
        descricao: isDesativando
          ? `Equipamento desativado.${motivoDesativacao ? ` Motivo: ${motivoDesativacao}` : ''}`
          : `Status alterado de ${equipamento.status} para ${restante.status}.`,
        origem: 'usuario',
        status: restante.status,
        impactaAnalise: ['Inoperante', 'UsoLimitado', 'Desativado'].includes(restante.status),
        referenciaId: id,
        referenciaTipo: 'equipamento',
        metadata: {
          statusAnterior: equipamento.status,
          statusNovo: restante.status,
          ...(isDesativando && { motivoDesativacao }),
        },
      });
    }

    if (camposAlterados.length > 0) {
      await registrarEventoHistoricoAtivo({
        tenantId,
        equipamentoId: id,
        tipoEvento: 'alteracao_cadastral',
        categoria: 'alteracao_cadastral',
        subcategoria: 'edicao_cadastro',
        titulo: 'Cadastro do equipamento atualizado',
        descricao: montarDescricaoAlteracaoCadastral(camposAlterados),
        origem: 'usuario',
        status: atualizado.status,
        impactaAnalise: false,
        referenciaId: id,
        referenciaTipo: 'equipamento',
        metadata: {
          camposAlterados,
        },
      });
    }

    const equipamentoCompleto = await buscarEquipamentoCompleto(tenantId, id);

    return res.json(equipamentoCompleto || atualizado);
  } catch (error) {
    console.error('[EQUIP_UPDATE_ERROR]', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'Já existe um equipamento com esse identificador único.',
      });
    }

    if (error.status) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    return res.status(500).json({ message: 'Erro ao atualizar equipamento.' });
  }
});

// ==============================
// DELETE
// ==============================
router.delete('/:id', admin, async (req, res) => {
  const { id } = req.params;
  const tenantId = req.usuario.tenantId;

  try {
    const equipamento = await prisma.equipamento.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        anexos: true,
      },
    });

    if (!equipamento) {
      return res.status(404).json({ message: 'Equipamento não encontrado.' });
    }

    for (const anexo of equipamento.anexos || []) {
      try {
        deleteStoredFile(anexo.path);
      } catch (fileError) {
        console.error(
          `[EQUIP_DELETE_FILE_ERROR] equipamentoId=${id} anexoId=${anexo.id}`,
          fileError
        );
      }
    }

    await prisma.equipamento.delete({
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
      entidade: 'Equipamento',
      entidadeId: id,
      detalhes: `Equipamento "${equipamento.modelo}" excluído.`,
    });

    return res.json({ message: 'Excluído com sucesso.' });
  } catch (error) {
    console.error('[EQUIP_DELETE_ERROR]', error);

    if (error.code === 'P2003') {
      return res.status(409).json({
        message:
          'Não é possível excluir: equipamento possui vínculos ativos no sistema.',
      });
    }

    return res.status(500).json({ message: 'Erro ao excluir.' });
  }
});

// ==============================
// UPLOAD ANEXOS
// Campo multipart oficial do SIMEC: "file"
// ==============================
router.post(
  '/:id/anexos',
  uploadFor('equipamentos'),
  async (req, res, next) => {
    try {
      const tenantId = req.usuario.tenantId;
      const usuarioId = req.usuario.id;
      const equipamentoId = req.params.id;

      await adicionarAnexos({
        resource: 'equipamentos',
        tenantId,
        usuarioId,
        entityId: equipamentoId,
        files: req.files,
      });

      const atualizado = await buscarEquipamentoCompleto(
        tenantId,
        equipamentoId
      );

      return res.status(201).json(atualizado);
    } catch (error) {
      console.error('[EQUIP_UPLOAD_ERROR]', error);
      return next(error);
    }
  }
);

// ==============================
// DELETE ANEXO
// ==============================
router.delete('/:id/anexos/:anexoId', async (req, res, next) => {
  try {
    await removerAnexo({
      resource: 'equipamentos',
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      entityId: req.params.id,
      anexoId: req.params.anexoId,
    });

    return res.status(204).send();
  } catch (error) {
    console.error('[EQUIP_ANEXO_DELETE_ERROR]', error);

    if (error.status) {
      return res.status(error.status).json({
        message: error.message,
      });
    }

    return next(error);
  }
});

// ==============================
// GET ACESSÓRIOS
// ==============================
router.get('/:id/acessorios', async (req, res) => {
  const equipamentoId = req.params.id;
  const tenantId = req.usuario.tenantId;

  try {
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

    const acessorios = await prisma.acessorio.findMany({
      where: {
        tenantId,
        equipamentoId,
      },
      orderBy: {
        nome: 'asc',
      },
    });

    return res.json(acessorios);
  } catch (error) {
    console.error('[ACESSORIO_LIST_ERROR]', error);
    return res.status(500).json({
      message: 'Erro ao buscar acessórios.',
    });
  }
});

// ==============================
// POST ACESSÓRIO
// ==============================
router.post('/:id/acessorios', async (req, res) => {
  const equipamentoId = req.params.id;
  const { nome, numeroSerie, descricao } = req.body;
  const tenantId = req.usuario.tenantId;

  if (!nome || typeof nome !== 'string' || nome.trim() === '') {
    return res.status(400).json({
      message: 'O nome do acessório é obrigatório.',
    });
  }

  try {
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

    const numeroSerieNormalizado = numeroSerie?.trim() || null;

    if (numeroSerieNormalizado) {
      const serieExistente = await prisma.acessorio.findFirst({
        where: {
          tenantId,
          numeroSerie: {
            equals: numeroSerieNormalizado,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
        },
      });

      if (serieExistente) {
        return res.status(409).json({
          message: 'Já existe um acessório com este número de série.',
        });
      }
    }

    const novoAcessorio = await prisma.acessorio.create({
      data: {
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
        nome: nome.trim(),
        numeroSerie: numeroSerieNormalizado,
        descricao: descricao?.trim() || null,
      },
    });

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'CRIAÇÃO',
      entidade: 'Acessório',
      entidadeId: novoAcessorio.id,
      detalhes: `Acessório "${novoAcessorio.nome}" criado para o equipamento ${equipamento.modelo} (${equipamento.tag}).`,
    });

    return res.status(201).json(novoAcessorio);
  } catch (error) {
    console.error('[ACESSORIO_CREATE_ERROR]', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'Já existe um acessório com este número de série.',
      });
    }

    return res.status(500).json({
      message: 'Erro ao criar acessório.',
    });
  }
});

// ==============================
// PUT ACESSÓRIO
// ==============================
router.put('/:id/acessorios/:acessorioId', async (req, res) => {
  const equipamentoId = req.params.id;
  const acessorioId = req.params.acessorioId;
  const { nome, numeroSerie, descricao } = req.body;
  const tenantId = req.usuario.tenantId;

  if (!nome || typeof nome !== 'string' || nome.trim() === '') {
    return res.status(400).json({
      message: 'O nome do acessório é obrigatório.',
    });
  }

  try {
    const acessorio = await prisma.acessorio.findFirst({
      where: {
        id: acessorioId,
        tenantId,
        equipamentoId,
      },
      select: {
        id: true,
        nome: true,
      },
    });

    if (!acessorio) {
      return res.status(404).json({
        message: 'Acessório não encontrado.',
      });
    }

    const numeroSerieNormalizado = numeroSerie?.trim() || null;

    if (numeroSerieNormalizado) {
      const serieExistente = await prisma.acessorio.findFirst({
        where: {
          tenantId,
          id: {
            not: acessorioId,
          },
          numeroSerie: {
            equals: numeroSerieNormalizado,
            mode: 'insensitive',
          },
        },
        select: {
          id: true,
        },
      });

      if (serieExistente) {
        return res.status(409).json({
          message: 'Já existe um acessório com este número de série.',
        });
      }
    }

    const atualizado = await prisma.acessorio.update({
      where: {
        id: acessorioId,
      },
      data: {
        nome: nome.trim(),
        numeroSerie: numeroSerieNormalizado,
        descricao: descricao?.trim() || null,
      },
    });

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'EDIÇÃO',
      entidade: 'Acessório',
      entidadeId: acessorioId,
      detalhes: `Acessório "${atualizado.nome}" atualizado.`,
    });

    return res.json(atualizado);
  } catch (error) {
    console.error('[ACESSORIO_UPDATE_ERROR]', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        message: 'Já existe um acessório com este número de série.',
      });
    }

    return res.status(500).json({
      message: 'Erro ao atualizar acessório.',
    });
  }
});

// ==============================
// DELETE ACESSÓRIO
// ==============================
router.delete('/:id/acessorios/:acessorioId', async (req, res) => {
  const equipamentoId = req.params.id;
  const acessorioId = req.params.acessorioId;
  const tenantId = req.usuario.tenantId;

  try {
    const acessorio = await prisma.acessorio.findFirst({
      where: {
        id: acessorioId,
        tenantId,
        equipamentoId,
      },
      select: {
        id: true,
        nome: true,
      },
    });

    if (!acessorio) {
      return res.status(404).json({
        message: 'Acessório não encontrado.',
      });
    }

    await prisma.acessorio.delete({
      where: {
        id: acessorioId,
      },
    });

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'EXCLUSÃO',
      entidade: 'Acessório',
      entidadeId: acessorioId,
      detalhes: `Acessório "${acessorio.nome}" excluído.`,
    });

    return res.status(204).send();
  } catch (error) {
    console.error('[ACESSORIO_DELETE_ERROR]', error);
    return res.status(500).json({
      message: 'Erro ao excluir acessório.',
    });
  }
});

export default router;
