import express from 'express';
import prisma from '../services/prismaService.js';
import { proteger } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(proteger);


// Salvar nova ocorrência na Ficha Técnica
router.post('/', async (req, res) => {
  const { equipamentoId, titulo, descricao, tipo, tecnico } = req.body;
  try {
    const nova = await prisma.ocorrencia.create({
      data: { 
        equipamentoId, 
        titulo, 
        descricao, 
        tipo, 
        tecnico 
      }
    });
    res.status(201).json(nova);
  } catch (error) {
    console.error("Erro ao registrar ocorrencia:", error);
    res.status(500).json({ message: 'Erro ao registrar na ficha técnica.' });
  }
});

// Rota para marcar uma ocorrência como resolvida
router.put('/:id/resolver', async (req, res) => {
  const { id } = req.params;
  const { solucao, tecnicoResolucao } = req.body;

  try {
    const atualizada = await prisma.ocorrencia.update({
      where: { id },
      data: {
        resolvido: true,
        solucao,
        tecnicoResolucao,
        dataResolucao: new Date()
      }
    });
    res.json(atualizada);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao registrar solução.' });
  }
});

// Listar histórico da ficha técnica de um equipamento específico
router.get('/equipamento/:id', async (req, res) => {
  try {
    const lista = await prisma.ocorrencia.findMany({
      where: { equipamentoId: req.params.id },
      orderBy: { data: 'desc' }
    });
    res.json(lista);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar ficha técnica.' });
  }
});

export default router;