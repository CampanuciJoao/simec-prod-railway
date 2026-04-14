// Ficheiro: backend-simec/routes/manutencoesRoutes.js
// Versão: profissional, multi-tenant hardened, timezone-aware, local-first,
// com criação, leitura e edição consistentes para frontend e backend.

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import prisma from '../services/prismaService.js';
import { registrarLog } from '../services/logService.js';
import { proteger, admin } from '../middleware/authMiddleware.js';
import validate from '../middleware/validate.js';
import { manutencaoSchema } from '../validators/manutencaoValidator.js';
import {
  resolveOperationalTimezone,
  validateSchedulingWindow,
  MANUTENCAO_STATUSS_CONFLITANTES,
  FAR_FUTURE_UTC_DATE,
} from '../services/time/index.js';
import {
  adaptarListaManutencoesResponse,
  adaptarManutencaoResponse,
} from '../services/manutencaoResponseAdapter.js';

const router = express.Router();

router.use(proteger);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join('uploads', 'manutencoes');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

function montarMensagemErroAgendamento(code) {
  switch (code) {
    case 'INVALID_LOCAL_DATE':
      return 'A data do agendamento é inválida.';
    case 'INVALID_LOCAL_START_TIME':
      return 'A hora inicial do agendamento é inválida.';
    case 'INVALID_LOCAL_END_TIME':
      return 'A hora final do agendamento é inválida.';
    case 'PAST_LOCAL_DATETIME':
      return 'A data/hora informada está no passado.';
    case 'END_BEFORE_OR_EQUAL_START':
      return 'A hora final deve ser maior que a hora inicial.';
    default:
      return 'Data/hora de agendamento inválida.';
  }
}

async function buscarTenantAtivo(tenantId) {
  return prisma.tenant.findFirst({
    where: {
      id: tenantId,
      ativo: true,
    },
    select: {
      id: true,
      timezone: true,
      locale: true,
    },
  });
}

async function buscarContextoOperacional({ tenantId, equipamentoId }) {
  const tenant = await buscarTenantAtivo(tenantId);

  if (!tenant) {
    return {
      ok: false,
      status: 401,
      message: 'Tenant inválido ou inativo.',
    };
  }

  const equipamento = await prisma.equipamento.findFirst({
    where: {
      id: equipamentoId,
      tenantId,
    },
    select: {
      id: true,
      tag: true,
      modelo: true,
      unidadeId: true,
      unidade: {
        select: {
          id: true,
          timezone: true,
          nomeSistema: true,
          nomeFantasia: true,
        },
      },
    },
  });

  if (!equipamento) {
    return {
      ok: false,
      status: 404,
      message: 'Equipamento não encontrado.',
    };
  }

  const timezone = resolveOperationalTimezone({
    tenantTimezone: tenant.timezone,
    unidadeTimezone: equipamento.unidade?.timezone,
  });

  return {
    ok: true,
    tenant,
    equipamento,
    timezone,
  };
}

async function buscarManutencaoPorId({ tenantId, manutencaoId }) {
  return prisma.manutencao.findFirst({
    where: {
      id: manutencaoId,
      tenantId,
    },
    include: {
      anexos: true,
      equipamento: {
        include: {
          unidade: true,
        },
      },
      notasAndamento: {
        where: {
          tenantId,
        },
        orderBy: {
          data: 'desc',
        },
        include: {
          autor: {
            select: { nome: true },
          },
        },
      },
    },
  });
}

function montarPayloadPersistencia({
  dados,
  agendamento,
  tenantId,
  equipamentoId,
  numeroOS,
  numeroOSExistente = null,
}) {
  return {
    tenant: {
      connect: { id: tenantId },
    },

    equipamento: {
      connect: {
        tenantId_id: {
          tenantId,
          id: equipamentoId,
        },
      },
    },

    numeroOS: numeroOS || numeroOSExistente,
    tipo: dados.tipo,
    descricaoProblemaServico: dados.descricaoProblemaServico,
    tecnicoResponsavel: dados.tecnicoResponsavel?.trim() || null,
    numeroChamado:
      dados.tipo === 'Corretiva' ? dados.numeroChamado?.trim() || null : null,
    custoTotal:
      typeof dados.custoTotal === 'number' ? dados.custoTotal : null,
    status: dados.status || 'Agendada',

    agendamentoDataLocal: dados.agendamentoDataLocal,
    agendamentoHoraInicioLocal: dados.agendamentoHoraInicioLocal,
    agendamentoHoraFimLocal: dados.agendamentoHoraFimLocal || null,
    agendamentoTimezone: agendamento.timezone,

    dataHoraAgendamentoInicio: agendamento.startUtc,
    dataHoraAgendamentoFim: agendamento.endUtc,
  };
}

async function existeConflitoAgendamento({
  tenantId,
  equipamentoId,
  startUtc,
  endUtc,
  manutencaoIdIgnorar = null,
}) {
  const conflito = await prisma.manutencao.findFirst({
    where: {
      tenantId,
      equipamentoId,
      ...(manutencaoIdIgnorar
        ? {
            id: {
              not: manutencaoIdIgnorar,
            },
          }
        : {}),
      status: {
        in: MANUTENCAO_STATUSS_CONFLITANTES,
      },
      AND: [
        {
          dataHoraAgendamentoInicio: {
            lt: endUtc || FAR_FUTURE_UTC_DATE,
          },
        },
        {
          OR: [
            {
              dataHoraAgendamentoFim: {
                gt: startUtc,
              },
            },
            {
              dataHoraAgendamentoFim: null,
              dataHoraAgendamentoInicio: {
                lt: endUtc || FAR_FUTURE_UTC_DATE,
              },
            },
          ],
        },
      ],
    },
    select: {
      id: true,
      numeroOS: true,
      tipo: true,
      status: true,
      agendamentoDataLocal: true,
      agendamentoHoraInicioLocal: true,
      agendamentoHoraFimLocal: true,
    },
  });

  return conflito;
}

router.get('/', async (req, res) => {
  const { equipamentoId, unidadeId, tipo, status } = req.query;

  try {
    const tenantId = req.usuario.tenantId;
    const whereClause = { tenantId };

    if (equipamentoId) whereClause.equipamentoId = equipamentoId;
    if (tipo) whereClause.tipo = tipo;
    if (status) whereClause.status = status;

    if (unidadeId) {
      whereClause.equipamento = {
        tenantId,
        unidadeId,
      };
    }

    const manutencoes = await prisma.manutencao.findMany({
      where: whereClause,
      include: {
        equipamento: {
          include: {
            unidade: true,
          },
        },
        anexos: true,
      },
      orderBy: {
        dataHoraAgendamentoInicio: 'desc',
      },
    });

    return res.json(adaptarListaManutencoesResponse(manutencoes));
  } catch (error) {
    console.error('[MANUTENCAO_LIST_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao buscar manutenções.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const tenantId = req.usuario.tenantId;

    const manutencao = await buscarManutencaoPorId({
      tenantId,
      manutencaoId: req.params.id,
    });

    if (!manutencao) {
      return res.status(404).json({ message: 'Manutenção não encontrada.' });
    }

    return res.json(adaptarManutencaoResponse(manutencao));
  } catch (error) {
    console.error('[MANUTENCAO_GET_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao buscar detalhes.' });
  }
});

router.post('/', validate(manutencaoSchema), async (req, res) => {
  const dados = req.validatedData || req.body;

  try {
    const tenantId = req.usuario.tenantId;

    const contexto = await buscarContextoOperacional({
      tenantId,
      equipamentoId: dados.equipamentoId,
    });

    if (!contexto.ok) {
      return res.status(contexto.status).json({ message: contexto.message });
    }

    const agendamento = validateSchedulingWindow({
      dateLocal: dados.agendamentoDataLocal,
      startTimeLocal: dados.agendamentoHoraInicioLocal,
      endTimeLocal: dados.agendamentoHoraFimLocal || null,
      timezone: contexto.timezone,
    });

    if (!agendamento.valid) {
      return res.status(400).json({
        message: montarMensagemErroAgendamento(agendamento.code),
      });
    }

    const conflito = await existeConflitoAgendamento({
      tenantId,
      equipamentoId: dados.equipamentoId,
      startUtc: agendamento.startUtc,
      endUtc: agendamento.endUtc,
    });

    if (conflito) {
      return res.status(409).json({
        message: `Já existe uma manutenção conflitante para esse equipamento: OS ${conflito.numeroOS}.`,
        conflito,
      });
    }

    const totalTenant = await prisma.manutencao.count({
      where: { tenantId },
    });

    const osNumber = String(totalTenant + 1).padStart(4, '0');
    const tagPrefix = (contexto.equipamento.tag || 'MAN')
      .substring(0, 3)
      .toUpperCase();
    const numeroOS = `${dados.tipo.substring(0, 1).toUpperCase()}${tagPrefix}-${osNumber}`;

    const payload = montarPayloadPersistencia({
      dados,
      agendamento,
      tenantId,
      equipamentoId: dados.equipamentoId,
      numeroOS,
    });

    const nova = await prisma.manutencao.create({
      data: payload,
      include: {
        equipamento: {
          include: {
            unidade: true,
          },
        },
        anexos: true,
      },
    });

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'CRIAÇÃO',
      entidade: 'Manutenção',
      entidadeId: nova.id,
      detalhes: `OS ${numeroOS} criada.`,
    });

    return res.status(201).json(adaptarManutencaoResponse(nova));
  } catch (error) {
    console.error('[MANUTENCAO_CREATE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao agendar manutenção.' });
  }
});

router.put('/:id', validate(manutencaoSchema), async (req, res) => {
  const dados = req.validatedData || req.body;

  try {
    const tenantId = req.usuario.tenantId;
    const manutencaoId = req.params.id;

    const manutencaoAtual = await prisma.manutencao.findFirst({
      where: {
        id: manutencaoId,
        tenantId,
      },
      select: {
        id: true,
        numeroOS: true,
        equipamentoId: true,
        status: true,
      },
    });

    if (!manutencaoAtual) {
      return res.status(404).json({ message: 'Manutenção não encontrada.' });
    }

    const contexto = await buscarContextoOperacional({
      tenantId,
      equipamentoId: dados.equipamentoId,
    });

    if (!contexto.ok) {
      return res.status(contexto.status).json({ message: contexto.message });
    }

    const agendamento = validateSchedulingWindow({
      dateLocal: dados.agendamentoDataLocal,
      startTimeLocal: dados.agendamentoHoraInicioLocal,
      endTimeLocal: dados.agendamentoHoraFimLocal || null,
      timezone: contexto.timezone,
    });

    if (!agendamento.valid) {
      return res.status(400).json({
        message: montarMensagemErroAgendamento(agendamento.code),
      });
    }

    const conflito = await existeConflitoAgendamento({
      tenantId,
      equipamentoId: dados.equipamentoId,
      startUtc: agendamento.startUtc,
      endUtc: agendamento.endUtc,
      manutencaoIdIgnorar: manutencaoId,
    });

    if (conflito) {
      return res.status(409).json({
        message: `Já existe uma manutenção conflitante para esse equipamento: OS ${conflito.numeroOS}.`,
        conflito,
      });
    }

    const payload = montarPayloadPersistencia({
      dados,
      agendamento,
      tenantId,
      equipamentoId: dados.equipamentoId,
      numeroOSExistente: manutencaoAtual.numeroOS,
    });

    const atualizada = await prisma.manutencao.update({
      where: {
        tenantId_id: {
          tenantId,
          id: manutencaoId,
        },
      },
      data: payload,
      include: {
        equipamento: {
          include: {
            unidade: true,
          },
        },
        anexos: true,
        notasAndamento: {
          where: {
            tenantId,
          },
          orderBy: {
            data: 'desc',
          },
          include: {
            autor: {
              select: { nome: true },
            },
          },
        },
      },
    });

    await registrarLog({
      tenantId,
      usuarioId: req.usuario.id,
      acao: 'EDIÇÃO',
      entidade: 'Manutenção',
      entidadeId: atualizada.id,
      detalhes: `OS ${atualizada.numeroOS} atualizada.`,
    });

    return res.json(adaptarManutencaoResponse(atualizada));
  } catch (error) {
    console.error('[MANUTENCAO_UPDATE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao atualizar manutenção.' });
  }
});

router.post('/:id/notas', async (req, res) => {
  const { nota } = req.body;

  if (!nota) {
    return res.status(400).json({
      message: 'A nota é obrigatória.',
    });
  }

  try {
    const tenantId = req.usuario.tenantId;

    const manutencao = await prisma.manutencao.findFirst({
      where: {
        id: req.params.id,
        tenantId,
      },
    });

    if (!manutencao) {
      return res.status(404).json({ message: 'Manutenção não encontrada.' });
    }

    const nova = await prisma.notaAndamento.create({
      data: {
        tenant: {
          connect: { id: tenantId },
        },
        nota,
        autor: {
          connect: {
            tenantId_id: {
              tenantId,
              id: req.usuario.id,
            },
          },
        },
        manutencao: {
          connect: {
            tenantId_id: {
              tenantId,
              id: req.params.id,
            },
          },
        },
      },
    });

    return res.status(201).json(nova);
  } catch (error) {
    console.error('[MANUTENCAO_NOTA_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao adicionar nota.' });
  }
});

router.delete('/:id', admin, async (req, res) => {
  const { id } = req.params;
  const tenantId = req.usuario.tenantId;

  try {
    const manut = await prisma.manutencao.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        anexos: true,
      },
    });

    if (!manut) {
      return res.status(404).json({ message: 'Manutenção não encontrada.' });
    }

    manut.anexos?.forEach((anexo) => {
      if (anexo.path && fs.existsSync(anexo.path)) {
        fs.unlinkSync(anexo.path);
      }
    });

    await prisma.manutencao.delete({
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
      entidade: 'Manutenção',
      entidadeId: id,
      detalhes: `Manutenção "${manut.numeroOS}" excluída.`,
    });

    return res.status(204).send();
  } catch (error) {
    console.error('[MANUTENCAO_DELETE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao excluir manutenção.' });
  }
});

export default router;