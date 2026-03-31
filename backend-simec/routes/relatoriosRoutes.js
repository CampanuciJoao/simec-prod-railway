// Ficheiro: simec/backend-simec/routes/relatoriosRoutes.js
// VERSÃO FINAL CORRIGIDA - COM FILTRO DE UNIDADE EM MANUTENÇÕES FUNCIONAL

import express from 'express';
import prisma from '../services/prismaService.js';

const router = express.Router();

// ROTA: POST /api/relatorios/gerar
// FINALIDADE: Gerar diferentes tipos de relatórios com base em filtros dinâmicos.
router.post('/gerar', async (req, res) => {
    const { tipoRelatorio, dataInicio, dataFim, unidadeId, equipamentoId, tipoManutencao, fabricante, status } = req.body;

    if (!tipoRelatorio) {
        return res.status(400).json({ message: 'O tipo de relatório é obrigatório.' });
    }

    try {
        let dadosRelatorio = [];
        const whereClause = {}; 

        if (tipoRelatorio === 'inventarioEquipamentos') {
            if (unidadeId) whereClause.unidadeId = unidadeId;
            if (fabricante) whereClause.fabricante = fabricante;
            if (status) whereClause.status = status;

            dadosRelatorio = await prisma.manutencao.findMany({
                where: whereClause,
                select: {
                    numeroOS: true,
                    tipo: true,
                    dataConclusao: true,
                    tecnicoResponsavel: true,
                    descricaoProblemaServico: true, // <<< ADICIONADO
                    equipamento: {
                        select: { modelo: true, tag: true }
                    }
                },
                orderBy: { dataConclusao: 'desc' }
            });
        }
        
        else if (tipoRelatorio === 'manutencoesRealizadas') {
            if (!dataInicio || !dataFim) {
                return res.status(400).json({ message: 'Período de datas é obrigatório para este relatório.' });
            }
            
            whereClause.status = 'Concluida';
            whereClause.dataConclusao = {
                gte: new Date(dataInicio),
                // Adiciona 1 dia e subtrai 1ms para garantir que o dia final seja incluído
                lte: new Date(new Date(dataFim).setDate(new Date(dataFim).getDate() + 1) - 1)
            };
            if (tipoManutencao) whereClause.tipo = tipoManutencao;
            if (equipamentoId) whereClause.equipamentoId = equipamentoId;

            // ==========================================================================
            // >> CORREÇÃO PRINCIPAL APLICADA AQUI <<
            // A filtragem por unidade agora é aplicada corretamente na relação aninhada.
            // ==========================================================================
            if (unidadeId) {
                whereClause.equipamento = {
                    ...whereClause.equipamento, // Mantém outros filtros de equipamento se houver
                    unidadeId: unidadeId
                };
            }

            dadosRelatorio = await prisma.manutencao.findMany({
                where: whereClause,
                select: {
                    numeroOS: true,
                    tipo: true,
                    dataConclusao: true,
                    tecnicoResponsavel: true,
                    descricaoProblemaServico: true,
                    equipamento: {
                        select: { modelo: true, tag: true }
                    }
                },
                orderBy: { dataConclusao: 'desc' }
            });
        }
        
        else {
            return res.status(400).json({ message: 'Tipo de relatório inválido ou não implementado.' });
        }
        
        res.json({
            tipoRelatorio,
            periodo: { inicio: dataInicio, fim: dataFim },
            filtros: { unidadeId, fabricante, tipoManutencao, equipamentoId, status },
            dados: dadosRelatorio
        });

    } catch (error) {
        console.error("Erro ao gerar relatório:", error);
        res.status(500).json({ message: "Erro interno do servidor ao gerar relatório." });
    }
});

export default router;