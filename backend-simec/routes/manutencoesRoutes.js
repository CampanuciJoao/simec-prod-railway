// Ficheiro: routes/manutencoesRoutes.js
// Versão: Multi-tenant hardened + timezone standardized

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../services/prismaService.js';
import { registrarLog } from '../services/logService.js';
import { proteger, admin } from '../middleware/authMiddleware.js';
import {
  criarIntervaloUTCFromLocal,
  extrairDataLocalFromISO,
  extrairHoraLocalFromISO,
  getTenantTimezone,
  parseISOToUTC,
} from '../services/timeService.js';

import validate from '../middleware/validate.js';
import { manutencaoSchema } from '../validators/manutencaoValidator.js';

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

function resolverAgendamentoLocalEDatetimeUTC(dados, tenantTimezone) {
  const dataLocal =
    dados.agendamentoDataLocal ||
    dados.data ||
    extrairDataLocalFromISO(dados.dataHoraAgendamentoInicio, tenantTimezone);

  const horaInicioLocal =
    dados.agendamentoHoraInicioLocal ||
    dados.horaInicio ||
    extrairHoraLocalFromISO(dados.dataHoraAgendamentoInicio, tenantTimezone);

  const horaFimLocal =
    dados.agendamentoHoraFimLocal ||
    dados.horaFim ||
    extrairHoraLocalFromISO(dados.dataHoraAgendamentoFim, tenantTimezone);

  if (!dataLocal || !horaInicioLocal) {
    return {
      ok: false,
      motivo: 'DATA_HORA_LOCAL_OBRIGATORIA',
    };
  }

  const intervalo =
    dados.dataHoraAgendamentoInicio || dados.dataHoraAgendamentoFim
      ? {
          inicio: parseISOToUTC(dados.dataHoraAgendamentoInicio),
          fim: dados.dataHoraAgendamentoFim
            ? parseISOToUTC(dados.dataHoraAgendamentoFim)
            : null,
        }
      : criarIntervaloUTCFromLocal({
          dataLocal,
          horaInicioLocal,
          horaFimLocal,
          timeZone: tenantTimezone,
        });

  if (!intervalo.inicio) {
    return {
      ok: false,
      motivo: 'DATA_HORA_INICIO_INVALIDA',
    };
  }

  if (intervalo.fim && intervalo.fim.getTime() <= intervalo.inicio.getTime()) {
    return {
      ok: false,
      motivo: 'FIM_ANTES_DO_INICIO',
    };
  }

  return {
    ok: true,
    agendamentoDataLocal: dataLocal,
    agendamentoHoraInicioLocal: horaInicioLocal,
    agendamentoHoraFimLocal: horaFimLocal || null,
    agendamentoTimezone: tenantTimezone,
    dataHoraAgendamentoInicio: intervalo.inicio,
    dataHoraAgendamentoFim: intervalo.fim,
  };
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

    return res.json(manutencoes);
  } catch (error) {
    console.error('[MANUTENCAO_LIST_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao buscar manutenções.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const tenantId = req.usuario.tenantId;

    const manutencao = await prisma.manutencao.findFirst({
      where: {
        id: req.params.id,
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

    if (!manutencao) {
      return res.status(404).json({ message: 'Manutenção não encontrada.' });
    }

    return res.json(manutencao);
  } catch (error) {
    console.error('[MANUTENCAO_GET_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao buscar detalhes.' });
  }
});

router.post('/', validate(manutencaoSchema), async (req, res) => {
  const dados = req.validatedData || req.body;

  const {
    equipamentoId,
    tipo,
    descricaoProblemaServico,
    ...outrosDados
  } = dados;

  try {
    const tenantId = req.usuario.tenantId;
    const tenantTimezone = getTenantTimezone(req.usuario?.tenant);

    const equipamento = await prisma.equipamento.findFirst({
      where: {
        id: equipamentoId,
        tenantId,
      },
      select: {
        id: true,
        tag: true,
        modelo: true,
      },
    });

    if (!equipamento) {
      return res.status(404).json({ message: 'Equipamento não encontrado.' });
    }

    const agendamento = resolverAgendamentoLocalEDatetimeUTC(
      dados,
      tenantTimezone
    );

    if (!agendamento.ok) {
      return res.status(400).json({
        message:
          agendamento.motivo === 'FIM_ANTES_DO_INICIO'
            ? 'A hora final deve ser maior que a hora inicial.'
            : 'Data/hora de agendamento inválida.',
      });
    }

    const totalTenant = await prisma.manutencao.count({
      where: { tenantId },
    });

    const osNumber = String(totalTenant + 1).padStart(4, '0');
    const tagPrefix = (equipamento.tag || 'MAN').substring(0, 3).toUpperCase();
    const numeroOS = `${tipo.substring(0, 1).toUpperCase()}${tagPrefix}-${osNumber}`;

    const nova = await prisma.manutencao.create({
      data: {
        ...outrosDados,
        numeroOS,
        tipo,
        descricaoProblemaServico,

        agendamentoDataLocal: agendamento.agendamentoDataLocal,
        agendamentoHoraInicioLocal: agendamento.agendamentoHoraInicioLocal,
        agendamentoHoraFimLocal: agendamento.agendamentoHoraFimLocal,
        agendamentoTimezone: agendamento.agendamentoTimezone,

        dataHoraAgendamentoInicio: agendamento.dataHoraAgendamentoInicio,
        dataHoraAgendamentoFim: agendamento.dataHoraAgendamentoFim,

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

    return res.status(201).json(nova);
  } catch (error) {
    console.error('[MANUTENCAO_CREATE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao agendar manutenção.' });
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