// Ficheiro: simec/backend-simec/routes/unidadesRoutes.js
// VERSÃO 8.0 - COM VALIDAÇÃO ZOD E ENDEREÇO NORMALIZADO

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../services/prismaService.js';
import { registrarLog } from '../services/logService.js';

// --- NOVAS IMPORTAÇÕES DE SEGURANÇA ---
import validate from '../middleware/validate.js';
import { unidadeSchema } from '../validators/unidadeValidator.js';

const router = express.Router();

// Configuração do Multer para o armazenamento de anexos de unidades.
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/unidades';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const nomeUnico = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, nomeUnico);
    }
});
const upload = multer({ storage: storage });


// ==========================================================================
// SEÇÃO: ROTAS DE UNIDADES (CRUD)
// ==========================================================================

/** @route   GET /api/unidades */
router.get('/', async (req, res) => {
    try {
        const unidades = await prisma.unidade.findMany({
            orderBy: { nomeSistema: 'asc' }
        });
        res.json(unidades);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar unidades.' });
    }
});

/** @route   GET /api/unidades/:id */
router.get('/:id', async (req, res) => {
    try {
        const unidade = await prisma.unidade.findUnique({
            where: { id: req.params.id },
            include: { anexos: true }
        });
        if (unidade) {
            res.json(unidade);
        } else {
            res.status(404).json({ message: 'Unidade não encontrada.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar unidade.' });
    }
});

/** 
 * @route   POST /api/unidades 
 * ADICIONADO: validate(unidadeSchema) para blindagem de dados
 */
router.post('/', validate(unidadeSchema), async (req, res) => {
    // Agora o req.body já vem limpo e validado pelo Zod
    const { nomeSistema, nomeFantasia, cnpj, logradouro, numero, complemento, bairro, cidade, estado, cep } = req.body;
    
    try {
        const novaUnidade = await prisma.unidade.create({
            data: {
                nomeSistema,
                nomeFantasia,
                cnpj,
                logradouro,
                numero,
                complemento,
                bairro,
                cidade,
                estado,
                cep
            }
        });
        
        await registrarLog({ 
            usuarioId: req.usuario.id,
            acao: 'CRIAÇÃO',
            entidade: 'Unidade',
            entidadeId: novaUnidade.id,
            detalhes: `Unidade "${novaUnidade.nomeSistema}" foi criada.`
        });

        res.status(201).json(novaUnidade);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ message: 'Já existe uma unidade com este Nome ou CNPJ.' });
        }
        res.status(500).json({ message: 'Erro ao criar unidade.' });
    }
});

/** 
 * @route   PUT /api/unidades/:id 
 * ADICIONADO: validate(unidadeSchema) para garantir edição correta
 */
router.put('/:id', validate(unidadeSchema), async (req, res) => {
    const { id } = req.params;
    const { nomeSistema, nomeFantasia, cnpj, logradouro, numero, complemento, bairro, cidade, estado, cep } = req.body;
    
    try {
        const unidadeAtualizada = await prisma.unidade.update({
            where: { id },
            data: {
                nomeSistema,
                nomeFantasia,
                cnpj,
                logradouro,
                numero,
                complemento,
                bairro,
                cidade,
                estado,
                cep
            }
        });
        
        await registrarLog({
            usuarioId: req.usuario.id,
            acao: 'EDIÇÃO',
            entidade: 'Unidade',
            entidadeId: id,
            detalhes: `Unidade "${unidadeAtualizada.nomeSistema}" foi atualizada.`
        });

        res.json(unidadeAtualizada);
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Unidade não encontrada.' });
        }
        res.status(500).json({ message: 'Erro ao atualizar unidade.' });
    }
});

/** @route   DELETE /api/unidades/:id */
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const unidadeParaExcluir = await prisma.unidade.findUnique({
            where: { id },
            include: { anexos: true },
        });

        if (!unidadeParaExcluir) {
            return res.status(404).json({ message: 'Unidade não encontrada.' });
        }
        
        await prisma.unidade.delete({ where: { id } });

        if (unidadeParaExcluir.anexos && unidadeParaExcluir.anexos.length > 0) {
            unidadeParaExcluir.anexos.forEach(anexo => {
                if(anexo.path && fs.existsSync(anexo.path)) {
                    fs.unlinkSync(anexo.path);
                }
            });
        }
        
        await registrarLog({
            usuarioId: req.usuario.id,
            acao: 'EXCLUSÃO',
            entidade: 'Unidade',
            entidadeId: id,
            detalhes: `Unidade "${unidadeParaExcluir.nomeSistema}" e seus anexos excluídos.`
        });

        res.status(204).send();
    } catch (error) {
        if (error.code === 'P2003') {
            return res.status(409).json({ message: 'Não é possível excluir: unidade possui equipamentos vinculados.' });
        }
        res.status(500).json({ message: 'Erro ao excluir unidade.' });
    }
});


// ==========================================================================
// SEÇÃO: ROTAS DE ANEXOS
// ==========================================================================

router.post('/:id/anexos', upload.array('anexos'), async (req, res) => {
    const { id: unidadeId } = req.params;
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
    }
    try {
        const anexosData = req.files.map(file => ({
            unidadeId: unidadeId,
            nomeOriginal: file.originalname,
            path: file.path,
            tipoMime: file.mimetype,
        }));
        await prisma.anexo.createMany({ data: anexosData });
        const unidadeAtualizada = await prisma.unidade.findUnique({
            where: { id: unidadeId },
            include: { anexos: true }
        });
        res.status(201).json(unidadeAtualizada);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao salvar anexos.' });
    }
});

router.delete('/:id/anexos/:anexoId', async (req, res) => {
    const { anexoId } = req.params;
    try {
        const anexo = await prisma.anexo.findUnique({ where: { id: anexoId } });
        if (anexo && anexo.path && fs.existsSync(anexo.path)) {
            fs.unlinkSync(anexo.path);
        }
        await prisma.anexo.delete({ where: { id: anexoId } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Erro ao excluir anexo.' });
    }
});

export default router;