// simec/backend-simec/routes/pdfDataRoutes.js
import express from 'express';
import prisma from '../services/prismaService.js';
import { proteger } from '../middleware/authMiddleware.js';

const router = express.Router();

// Dados completos de uma OS para gerar PDF no frontend
router.get('/manutencao/:id', proteger, async (req, res) => {
    try {
        const manutencao = await prisma.manutencao.findUnique({
            where: { id: req.params.id },
            include: {
                equipamento: {
                    include: {
                        unidade: true
                    }
                },
                notasAndamento: {
                    include: {
                        autor: {
                            select: { nome: true }
                        }
                    },
                    orderBy: { data: 'asc' }
                }
            }
        });

        if (!manutencao) {
            return res.status(404).json({ message: 'Manutenção não encontrada.' });
        }

        return res.json(manutencao);
    } catch (error) {
        console.error('[PDF_DATA_OS_ERROR]', error);
        return res.status(500).json({ message: 'Erro ao buscar dados da OS.' });
    }
});

// Dados de um relatório para gerar PDF no frontend
router.post('/relatorio', proteger, async (req, res) => {
    try {
        const { ids } = req.body;

        const manutencoes = await prisma.manutencao.findMany({
            where: {
                id: { in: ids || [] }
            },
            select: {
                numeroOS: true,
                tipo: true,
                dataConclusao: true,
                tecnicoResponsavel: true,
                descricaoProblemaServico: true,
                numeroChamado: true,
                equipamento: {
                    select: {
                        modelo: true,
                        tag: true,
                        unidade: {
                            select: { nomeSistema: true }
                        }
                    }
                }
            },
            orderBy: { dataConclusao: 'desc' }
        });

        return res.json({
            tipoRelatorio: 'manutencoesRealizadas',
            dados: manutencoes
        });
    } catch (error) {
        console.error('[PDF_DATA_RELATORIO_ERROR]', error);
        return res.status(500).json({ message: 'Erro ao buscar dados do relatório.' });
    }
});

export default router;