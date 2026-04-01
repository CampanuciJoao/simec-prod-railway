// Ficheiro: simec/backend-simec/routes/equipamentosRoutes.js
// VERSÃO 8.0 - AGORA COM VALIDAÇÃO ZOD E PATRIMÔNIO INTELIGENTE

// --- 1. Importações ---
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../services/prismaService.js';
import { registrarLog } from '../services/logService.js';
import { admin } from '../middleware/authMiddleware.js';

// --- NOVAS IMPORTAÇÕES DE SEGURANÇA ---
import validate from '../middleware/validate.js'; 
import { equipamentoSchema } from '../validators/equipamentoValidator.js';

const router = express.Router();

// --- 2. Configuração do Multer para Upload de Anexos ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join('uploads', 'equipamentos');
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = uuidv4();
        cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
    },
});
const upload = multer({ storage });

// --- 3. Função Auxiliar para Datas ---
const parseDate = (dateString) => (dateString ? new Date(dateString) : null);


// ==========================================================================
// SEÇÃO: ROTAS PRINCIPAIS DE EQUIPAMENTOS (CRUD)
// ==========================================================================

/** @route   GET /api/equipamentos */
router.get('/', async (req, res) => {
    try {
        const equipamentos = await prisma.equipamento.findMany({
            include: { 
                unidade: { select: { id: true, nomeSistema: true } },
                anexos: true,
                acessorios: true
            },
            orderBy: { modelo: 'asc' }
        });
        res.json(equipamentos);
    } catch (error) {
        console.error("Erro ao buscar equipamentos:", error);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar equipamentos.' });
    }
});

/** @route   GET /api/equipamentos/:id */
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const equipamento = await prisma.equipamento.findUnique({
            where: { id },
            include: {
                unidade: true,
                acessorios: { orderBy: { nome: 'asc' } },
                anexos: { orderBy: { createdAt: 'desc' } }
            }
        });
        if (!equipamento) return res.status(404).json({ message: 'Equipamento não encontrado.' });
        res.json(equipamento);
    } catch (error) {
        console.error(`Erro ao buscar equipamento ${id}:`, error);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar o equipamento.' });
    }
});

/** 
 * @route   POST /api/equipamentos 
 * ADICIONADO: validate(equipamentoSchema) para filtrar dados antes de salvar
 */
router.post('/', validate(equipamentoSchema), async (req, res) => {
    const { dataInstalacao, ...dados } = req.body;
    
    // OBS: O Zod já validou se campos obrigatórios existem, não precisamos de IFs manuais aqui.

    try {
        // --- REGRA DE PATRIMÔNIO INTELIGENTE ---
        const patrimonioLimpo = dados.numeroPatrimonio?.trim();
        
        if (patrimonioLimpo && patrimonioLimpo.toLowerCase() !== "sem patrimônio") {
            const patrimonioExistente = await prisma.equipamento.findFirst({
                where: { 
                    numeroPatrimonio: { equals: patrimonioLimpo, mode: 'insensitive' } 
                }
            });

            if (patrimonioExistente) {
                return res.status(400).json({ 
                    message: `O número de patrimônio "${patrimonioLimpo}" já está cadastrado.` 
                });
            }
        }

        const novoEquipamento = await prisma.equipamento.create({
            data: { ...dados, dataInstalacao: parseDate(dataInstalacao) }
        });

        await registrarLog({
            usuarioId: req.usuario.id, acao: 'CRIAÇÃO', entidade: 'Equipamento',
            entidadeId: novoEquipamento.id, detalhes: `Equipamento "${novoEquipamento.modelo}" criado.`
        });

        res.status(201).json(novoEquipamento);
    } catch (error) {
        if (error.code === 'P2002') return res.status(409).json({ message: 'Já existe um equipamento com esta Tag (Nº Série).' });
        res.status(500).json({ message: 'Erro ao criar equipamento.' });
    }
});

/** 
 * @route   PUT /api/equipamentos/:id 
 * ADICIONADO: validate(equipamentoSchema) para garantir edição correta
 */
router.put('/:id', validate(equipamentoSchema), async (req, res) => {
    const { id } = req.params;
    const { dataInstalacao, ...dados } = req.body;
    
    try {
        const patrimonioEdicao = dados.numeroPatrimonio?.trim();

        if (patrimonioEdicao && patrimonioEdicao.toLowerCase() !== "sem patrimônio") {
            const conflitoPatrimonio = await prisma.equipamento.findFirst({
                where: { 
                    numeroPatrimonio: { equals: patrimonioEdicao, mode: 'insensitive' },
                    NOT: { id: id } 
                }
            });

            if (conflitoPatrimonio) {
                return res.status(400).json({ 
                    message: `O número de patrimônio "${patrimonioEdicao}" já pertence a outro equipamento.` 
                });
            }
        }

        const dadosParaAtualizar = { ...dados };
        if (dataInstalacao !== undefined) dadosParaAtualizar.dataInstalacao = parseDate(dataInstalacao);
        
        const equipamentoAtualizado = await prisma.equipamento.update({
            where: { id }, data: dadosParaAtualizar
        });

        await registrarLog({
            usuarioId: req.usuario.id, acao: 'EDIÇÃO', entidade: 'Equipamento',
            entidadeId: id, detalhes: `Equipamento "${equipamentoAtualizado.modelo}" atualizado.`
        });
        res.json(equipamentoAtualizado);
    } catch (error) {
        if (error.code === 'P2025') return res.status(404).json({ message: 'Equipamento não encontrado.' });
        res.status(500).json({ message: 'Erro ao atualizar equipamento.' });
    }
});

/** @route   DELETE /api/equipamentos/:id */
router.delete('/:id', admin, async (req, res) => {
    const { id } = req.params;
    try {
        const equipamentoExcluido = await prisma.equipamento.delete({ where: { id } });
        await registrarLog({
            usuarioId: req.usuario.id, acao: 'EXCLUSÃO', entidade: 'Equipamento',
            entidadeId: id, detalhes: `Equipamento "${equipamentoExcluido.modelo}" excluído.`
        });
        res.status(200).json({ message: 'Equipamento excluído com sucesso.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir equipamento.' });
    }
});

// [As rotas de Acessórios e Anexos continuam iguais abaixo...]
// ==========================================================================

router.get('/:equipamentoId/acessorios', async (req, res) => {
    const { equipamentoId } = req.params;
    try {
        const acessorios = await prisma.acessorio.findMany({
            where: { equipamentoId: equipamentoId },
            orderBy: { nome: 'asc' }
        });
        res.json(acessorios);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar acessórios.' });
    }
});

router.post('/:equipamentoId/acessorios', async (req, res) => {
    const { equipamentoId } = req.params;
    const { nome, numeroSerie, descricao } = req.body;
    if (!nome) return res.status(400).json({ message: 'O nome do acessório é obrigatório.' });
    try {
        const novoAcessorio = await prisma.acessorio.create({
            data: { nome, numeroSerie: numeroSerie || null, descricao: descricao || null, equipamento: { connect: { id: equipamentoId } } }
        });
        await registrarLog({
            usuarioId: req.usuario.id, acao: 'CRIAÇÃO', entidade: 'Acessório',
            entidadeId: novoAcessorio.id, detalhes: `Acessório "${nome}" adicionado.`
        });
        res.status(201).json(novoAcessorio);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao criar acessório.' });
    }
});

router.delete('/:equipamentoId/acessorios/:acessorioId', async (req, res) => {
    const { acessorioId } = req.params;
    try {
        await prisma.acessorio.delete({ where: { id: acessorioId } });
        res.status(200).json({ message: 'Acessório excluído.' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir acessório.' });
    }
});

router.post('/:equipamentoId/anexos', upload.array('anexosEquipamento'), async (req, res) => {
    const { equipamentoId } = req.params;
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'Nenhum ficheiro enviado.' });
    try {
        const anexosData = req.files.map(file => ({
            nomeOriginal: file.originalname, path: file.path, tipoMime: file.mimetype, equipamentoId: equipamentoId
        }));
        await prisma.anexo.createMany({ data: anexosData });
        const anexosAtualizados = await prisma.anexo.findMany({ where: { equipamentoId } });
        res.status(201).json(anexosAtualizados);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao salvar anexos.' });
    }
});

router.delete('/:equipamentoId/anexos/:anexoId', async (req, res) => {
    const { anexoId } = req.params;
    try {
        const anexo = await prisma.anexo.findUnique({ where: { id: anexoId } });
        if (anexo?.path && fs.existsSync(anexo.path)) fs.unlinkSync(anexo.path);
        await prisma.anexo.delete({ where: { id: anexoId } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir anexo.' });
    }
});

export default router;