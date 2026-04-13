// Ficheiro: routes/relatoriosRoutes.js
// Versão: Multi-tenant hardened
// Descrição: Geração de relatórios com isolamento por tenant

import express from 'express';
import {
  buscarManutencoesRealizadas,
  buscarInventarioEquipamentos,
} from '../services/reportQueryService.js';
import { proteger } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(proteger);

// ROTA: POST /api/relatorios/gerar
router.post('/gerar', async (req, res) => {
  const {
    tipoRelatorio,
    dataInicio,
    dataFim,
    unidadeId,
    equipamentoId,
    tipoManutencao,
    fabricante,
    status,
  } = req.body;

  const tenantId = req.usuario?.tenantId;

  if (!tenantId) {
    return res.status(401).json({
      message: 'Tenant não identificado na requisição.',
    });
  }

  if (!tipoRelatorio || typeof tipoRelatorio !== 'string') {
    return res.status(400).json({
      message: 'O tipo de relatório é obrigatório.',
    });
  }

  try {
    let dadosRelatorio = [];

    // INVENTÁRIO DE EQUIPAMENTOS
    if (tipoRelatorio === 'inventarioEquipamentos') {
      dadosRelatorio = await buscarInventarioEquipamentos({
        tenantId,
        unidadeId: unidadeId || null,
        fabricante: fabricante ? String(fabricante).trim() : null,
        status: status ? String(status).trim() : null,
      });
    }

    // MANUTENÇÕES REALIZADAS
    else if (tipoRelatorio === 'manutencoesRealizadas') {
      if (!dataInicio || !dataFim) {
        return res.status(400).json({
          message: 'Período de datas é obrigatório para este relatório.',
        });
      }

      const inicio = new Date(dataInicio);
      const fim = new Date(dataFim);

      if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
        return res.status(400).json({
          message: 'As datas informadas são inválidas.',
        });
      }

      if (inicio > fim) {
        return res.status(400).json({
          message: 'A data inicial não pode ser maior que a data final.',
        });
      }

      dadosRelatorio = await buscarManutencoesRealizadas({
        tenantId,
        dataInicio,
        dataFim,
        unidadeId: unidadeId || null,
        equipamentoId: equipamentoId || null,
        tipoManutencao: tipoManutencao ? String(tipoManutencao).trim() : null,
      });
    }

    // TIPO INVÁLIDO
    else {
      return res.status(400).json({
        message: 'Tipo de relatório inválido ou não implementado.',
      });
    }

    return res.status(200).json({
      tipoRelatorio,
      tenantId,
      periodo: {
        inicio: dataInicio || null,
        fim: dataFim || null,
      },
      filtros: {
        unidadeId: unidadeId || null,
        fabricante: fabricante || null,
        tipoManutencao: tipoManutencao || null,
        equipamentoId: equipamentoId || null,
        status: status || null,
      },
      total: Array.isArray(dadosRelatorio) ? dadosRelatorio.length : 0,
      dados: dadosRelatorio,
    });
  } catch (error) {
    console.error('[RELATORIOS_ROUTE_ERROR]', error);
    return res.status(500).json({
      message: 'Erro interno do servidor ao gerar relatório.',
    });
  }
});

export default router;