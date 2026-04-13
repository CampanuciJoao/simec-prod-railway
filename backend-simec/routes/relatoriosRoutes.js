// Ficheiro: routes/relatoriosRoutes.js
// Versão: Multi-tenant ready
// Descrição: Geração de relatórios com isolamento por tenant

import express from 'express';
import {
  buscarManutencoesRealizadas,
  buscarInventarioEquipamentos,
} from '../services/reportQueryService.js';

const router = express.Router();

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

  if (!tipoRelatorio) {
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
        unidadeId,
        fabricante,
        status,
      });
    }

    // MANUTENÇÕES REALIZADAS
    else if (tipoRelatorio === 'manutencoesRealizadas') {
      if (!dataInicio || !dataFim) {
        return res.status(400).json({
          message: 'Período de datas é obrigatório para este relatório.',
        });
      }

      dadosRelatorio = await buscarManutencoesRealizadas({
        tenantId,
        dataInicio,
        dataFim,
        unidadeId,
        equipamentoId,
        tipoManutencao,
      });
    }

    // TIPO INVÁLIDO
    else {
      return res.status(400).json({
        message: 'Tipo de relatório inválido ou não implementado.',
      });
    }

    return res.json({
      tipoRelatorio,
      tenantId,
      periodo: {
        inicio: dataInicio,
        fim: dataFim,
      },
      filtros: {
        unidadeId,
        fabricante,
        tipoManutencao,
        equipamentoId,
        status,
      },
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