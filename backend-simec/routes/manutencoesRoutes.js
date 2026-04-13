// Ficheiro: routes/manutencoesRoutes.js
// Versão: Multi-tenant ready + compatível com schema relacional por tenant

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../services/prismaService.js';
import { registrarLog } from '../services/logService.js';
import { admin } from '../middleware/authMiddleware.js';

import validate from '../middleware/validate.js';
import { manutencaoSchema } from '../validators/manutencaoValidator.js';

const router = express.Router();

// ==============================
// MULTER
// ==============================
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

// ==============================
// GET LISTAR MANUTENÇÕES
// ==============================
router.get('/', async (req, res) => {
  const { equipamentoId, unidadeId, tipo, status } = req.query;

  try {
    const whereClause = {
      tenantId: req.usuario.tenantId,
    };

    if (equipamentoId) whereClause.equipamentoId = equipamentoId;
    if (tipo) whereClause.tipo = tipo;
    if (status) whereClause.status = status;

    if (unidadeId) {
      whereClause.equipamento = {
        tenantId: req.usuario.tenantId,
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

// ==============================
// GET MANUTENÇÃO POR ID
// ==============================
router.get('/:id', async (req, res) => {
  try {
    const manutencao = await prisma.manutencao.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.usuario.tenantId,
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
            tenantId: req.usuario.tenantId,
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

// ==============================
// POST CRIAR MANUTENÇÃO
// ==============================
router.post('/', validate(manutencaoSchema), async (req, res) => {
  const dados = req.validatedData || req.body;

  const {
    equipamentoId,
    tipo,
    descricaoProblemaServico,
    dataHoraAgendamentoInicio,
    dataHoraAgendamentoFim,
    ...outrosDados
  } = dados;

  try {
    const equipamento = await prisma.equipamento.findFirst({
      where: {
        id: equipamentoId,
        tenantId: req.usuario.tenantId,
      },
      select: {
        id: true,
        tenantId: true,
        tag: true,
        modelo: true,
      },
    });

    if (!equipamento) {
      return res.status(404).json({ message: 'Equipamento não encontrado.' });
    }

    const totalTenant = await prisma.manutencao.count({
      where: {
        tenantId: req.usuario.tenantId,
      },
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
        dataHoraAgendamentoInicio: new Date(dataHoraAgendamentoInicio),
        dataHoraAgendamentoFim: dataHoraAgendamentoFim
          ? new Date(dataHoraAgendamentoFim)
          : null,

        tenant: {
          connect: {
            id: req.usuario.tenantId,
          },
        },

        equipamento: {
          connect: {
            tenantId_id: {
              tenantId: req.usuario.tenantId,
              id: equipamentoId,
            },
          },
        },
      },
    });

    await registrarLog({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      acao: 'CRIAÇÃO',
      entidade: 'Manutenção',
      entidadeId: nova.id,
      detalhes: `OS ${numeroOS} agendada para ${equipamento.modelo}.`,
    });

    return res.status(201).json(nova);
  } catch (error) {
    console.error('[MANUTENCAO_CREATE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao agendar manutenção.' });
  }
});

// ==============================
// POST CONCLUIR MANUTENÇÃO
// ==============================
router.post('/:id/concluir', async (req, res) => {
  const { id: manutencaoId } = req.params;
  const { equipamentoOperante, dataTerminoReal, novaPrevisao, observacao } =
    req.body;

  try {
    const resultado = await prisma.$transaction(async (tx) => {
      const manutAtual = await tx.manutencao.findFirst({
        where: {
          id: manutencaoId,
          tenantId: req.usuario.tenantId,
        },
      });

      if (!manutAtual) {
        throw new Error('MANUTENCAO_NAO_ENCONTRADA');
      }

      let notaHistorico = '';

      if (equipamentoOperante) {
        notaHistorico = `MANUTENÇÃO CONCLUÍDA: Equipamento Operante. Término: ${new Date(
          dataTerminoReal
        ).toLocaleString('pt-BR')}.`;

        await tx.manutencao.update({
          where: {
            tenantId_id: {
              tenantId: req.usuario.tenantId,
              id: manutencaoId,
            },
          },
          data: {
            status: 'Concluida',
            dataFimReal: new Date(dataTerminoReal),
            dataConclusao: new Date(),
          },
        });

        await tx.equipamento.update({
          where: {
            tenantId_id: {
              tenantId: req.usuario.tenantId,
              id: manutAtual.equipamentoId,
            },
          },
          data: { status: 'Operante' },
        });

        await tx.alerta.deleteMany({
          where: {
            tenantId: req.usuario.tenantId,
            id: `manut-confirm-${manutencaoId}`,
          },
        });
      } else {
        notaHistorico = `EQUIPAMENTO CONTINUA INOPERANTE: ${observacao}. Nova previsão: ${new Date(
          novaPrevisao
        ).toLocaleString('pt-BR')}.`;

        await tx.manutencao.update({
          where: {
            tenantId_id: {
              tenantId: req.usuario.tenantId,
              id: manutencaoId,
            },
          },
          data: {
            status: 'EmAndamento',
            dataHoraAgendamentoFim: new Date(novaPrevisao),
          },
        });

        await tx.equipamento.update({
          where: {
            tenantId_id: {
              tenantId: req.usuario.tenantId,
              id: manutAtual.equipamentoId,
            },
          },
          data: { status: 'Inoperante' },
        });
      }

      await tx.notaAndamento.create({
        data: {
          tenant: {
            connect: {
              id: req.usuario.tenantId,
            },
          },
          nota: notaHistorico,
          origem: 'automatico',
          manutencao: {
            connect: {
              tenantId_id: {
                tenantId: req.usuario.tenantId,
                id: manutencaoId,
              },
            },
          },
        },
      });

      return { status: equipamentoOperante ? 'Concluida' : 'EmAndamento' };
    });

    return res.json(resultado);
  } catch (error) {
    if (error.message === 'MANUTENCAO_NAO_ENCONTRADA') {
      return res.status(404).json({ message: 'Manutenção não encontrada.' });
    }

    console.error('[MANUTENCAO_CONCLUIR_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao processar a finalização.' });
  }
});

// ==============================
// POST CANCELAR MANUTENÇÃO
// ==============================
router.post('/:id/cancelar', async (req, res) => {
  const { id } = req.params;
  const { motivo } = req.body;

  if (!motivo) {
    return res.status(400).json({
      message: 'O motivo do cancelamento é obrigatório.',
    });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const manutencao = await tx.manutencao.findFirst({
        where: {
          id,
          tenantId: req.usuario.tenantId,
        },
      });

      if (!manutencao) {
        throw new Error('MANUTENCAO_NAO_ENCONTRADA');
      }

      await tx.manutencao.update({
        where: {
          tenantId_id: {
            tenantId: req.usuario.tenantId,
            id,
          },
        },
        data: { status: 'Cancelada' },
      });

      await tx.notaAndamento.create({
        data: {
          tenant: {
            connect: {
              id: req.usuario.tenantId,
            },
          },
          nota: `CANCELAMENTO: ${motivo}`,
          origem: 'manual',
          autor: {
            connect: {
              id: req.usuario.id,
            },
          },
          manutencao: {
            connect: {
              tenantId_id: {
                tenantId: req.usuario.tenantId,
                id,
              },
            },
          },
        },
      });
    });

    return res.json({ message: 'Manutenção cancelada com sucesso.' });
  } catch (error) {
    if (error.message === 'MANUTENCAO_NAO_ENCONTRADA') {
      return res.status(404).json({ message: 'Manutenção não encontrada.' });
    }

    console.error('[MANUTENCAO_CANCELAR_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao cancelar manutenção.' });
  }
});

// ==============================
// POST ADICIONAR NOTA
// ==============================
router.post('/:id/notas', async (req, res) => {
  try {
    const manutencao = await prisma.manutencao.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.usuario.tenantId,
      },
    });

    if (!manutencao) {
      return res.status(404).json({ message: 'Manutenção não encontrada.' });
    }

    const nova = await prisma.notaAndamento.create({
      data: {
        tenant: {
          connect: {
            id: req.usuario.tenantId,
          },
        },
        nota: req.body.nota,
        autor: {
          connect: {
            id: req.usuario.id,
          },
        },
        manutencao: {
          connect: {
            tenantId_id: {
              tenantId: req.usuario.tenantId,
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

// ==============================
// POST UPLOAD ANEXOS
// ==============================
router.post('/:id/upload', upload.array('arquivosManutencao'), async (req, res) => {
  try {
    const manutencao = await prisma.manutencao.findFirst({
      where: {
        id: req.params.id,
        tenantId: req.usuario.tenantId,
      },
    });

    if (!manutencao) {
      return res.status(404).json({ message: 'Manutenção não encontrada.' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
    }

    for (const file of req.files) {
      await prisma.anexo.create({
        data: {
          tenant: {
            connect: {
              id: req.usuario.tenantId,
            },
          },
          manutencao: {
            connect: {
              tenantId_id: {
                tenantId: req.usuario.tenantId,
                id: req.params.id,
              },
            },
          },
          nomeOriginal: file.originalname,
          path: file.path,
          tipoMime: file.mimetype,
        },
      });
    }

    return res.status(201).json({ message: 'Arquivos salvos com sucesso.' });
  } catch (error) {
    console.error('[MANUTENCAO_UPLOAD_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao salvar anexos.' });
  }
});

// ==============================
// DELETE MANUTENÇÃO
// ==============================
router.delete('/:id', admin, async (req, res) => {
  const { id } = req.params;

  try {
    const manut = await prisma.manutencao.findFirst({
      where: {
        id,
        tenantId: req.usuario.tenantId,
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
          tenantId: req.usuario.tenantId,
          id,
        },
      },
    });

    await registrarLog({
      tenantId: req.usuario.tenantId,
      usuarioId: req.usuario.id,
      acao: 'EXCLUSÃO',
      entidade: 'Manutenção',
      entidadeId: id,
      detalhes: `Manutenção "${manut.numeroOS}" foi excluída.`,
    });

    return res.status(204).send();
  } catch (error) {
    console.error('[MANUTENCAO_DELETE_ERROR]', error);
    return res.status(500).json({ message: 'Erro ao excluir manutenção.' });
  }
});

export default router;