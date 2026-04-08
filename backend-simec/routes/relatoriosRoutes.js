// Ficheiro: simec/backend-simec/routes/relatoriosRoutes.js
// VERSÃO ATUALIZADA - USANDO reportQueryService SEM QUEBRAR A API EXISTENTE

import express from 'express';
import {
    buscarManutencoesRealizadas,
    buscarInventarioEquipamentos
} from '../services/reportQueryService.js';

const router = express.Router();

// ROTA: POST /api/relatorios/gerar
// FINALIDADE: Gerar diferentes tipos de relatórios com base em filtros dinâmicos.
router.post('/gerar', async (req, res) => {
    const {
        tipoRelatorio,
        dataInicio,
        dataFim,
        unidadeId,
        equipamentoId,
        tipoManutencao,
        fabricante,
        status
    } = req.body;

    if (!tipoRelatorio) {
        return res.status(400).json({
            message: 'O tipo de relatório é obrigatório.'
        });
    }

    try {
        let dadosRelatorio = [];

        if (tipoRelatorio === 'inventarioEquipamentos') {
            dadosRelatorio = await buscarInventarioEquipamentos({
                unidadeId,
                fabricante,
                status
            });
        }

        else if (tipoRelatorio === 'manutencoesRealizadas') {
            if (!dataInicio || !dataFim) {
                return res.status(400).json({
                    message: 'Período de datas é obrigatório para este relatório.'
                });
            }

            dadosRelatorio = await buscarManutencoesRealizadas({
                dataInicio,
                dataFim,
                unidadeId,
                equipamentoId,
                tipoManutencao
            });
        }

        else {
            return res.status(400).json({
                message: 'Tipo de relatório inválido ou não implementado.'
            });
        }

        return res.json({
            tipoRelatorio,
            periodo: { inicio: dataInicio, fim: dataFim },
            filtros: {
                unidadeId,
                fabricante,
                tipoManutencao,
                equipamentoId,
                status
            },
            dados: dadosRelatorio
        });

    } catch (error) {
        console.error('[RELATORIOS_ROUTE_ERROR] Erro ao gerar relatório:', error);
        return res.status(500).json({
            message: 'Erro interno do servidor ao gerar relatório.'
        });
    }
});

export default router;