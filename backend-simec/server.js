import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

import authRoutes from './routes/authRoutes.js';
import agentRoutes from './routes/agentRoutes.js';
import userRoutes from './routes/userRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import equipamentosRoutes from './routes/equipamentosRoutes.js';
import manutencoesRoutes from './routes/manutencoesRoutes.js';
import alertasRoutes from './routes/alertasRoutes.js';
import contratosRoutes from './routes/contratosRoutes.js';
import relatoriosRoutes from './routes/relatoriosRoutes.js';
import segurosRoutes from './routes/segurosRoutes.js';
import auditoriaRoutes from './routes/auditoriaRoutes.js';
import unidadesRoutes from './routes/unidadesRoutes.js';
import emailsNotificacaoRoutes from './routes/emailsNotificacaoRoutes.js';
import ocorrenciasRoutes from './routes/ocorrenciasRoutes.js';
import biRoutes from './routes/biRoutes.js';
import pdfDataRoutes from './routes/pdfDataRoutes.js';
import pdfRoutes from './routes/pdfRoutes.js';
import superadminTenantsRoutes from './routes/superadminTenantsRoutes.js';
import tenantSettingsRoutes from './routes/tenantSettingsRoutes.js';
import helpRoutes from './routes/helpRoutes.js';
import superadminHelpRoutes from './routes/superadminHelpRoutes.js';
import orcamentosRoutes from './routes/orcamentosRoutes.js';
import osCorretivaRoutes from './routes/osCorretivaRoutes.js';

import { proteger } from './middleware/authMiddleware.js';
import { getLlmRuntimeInfo } from './services/ai/llmService.js';
import { iniciarJobsDeAlertas } from './services/queueService.js';
import { getFromR2 } from './services/uploads/fileStorageService.js';

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const corsOrigin = FRONTEND_URL === '*' ? true : FRONTEND_URL;

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

global.io = io;

io.on('connection', (socket) => {
  console.log(`[SOCKET] Navegador conectado ao SIMEC: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[SOCKET] Navegador desconectado do SIMEC: ${socket.id}`);
  });
});

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/uploads/*path', async (req, res) => {
  const key = 'uploads/' + req.params.path;
  try {
    const obj = await getFromR2(key);
    res.set('Content-Type', obj.ContentType || 'application/octet-stream');
    obj.Body.pipe(res);
  } catch {
    res.status(404).json({ error: 'Arquivo não encontrado.' });
  }
});

app.get('/', (req, res) => {
  res.send('API do SIMEC ativa e operante em tempo real!');
});

app.use('/api/auth', authRoutes);
app.use('/api/agent', agentRoutes);

app.use(proteger);

app.use('/api/dashboard-data', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/alertas', alertasRoutes);
app.use('/api/equipamentos', equipamentosRoutes);
app.use('/api/manutencoes', manutencoesRoutes);
app.use('/api/contratos', contratosRoutes);
app.use('/api/relatorios', relatoriosRoutes);
app.use('/api/seguros', segurosRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/unidades', unidadesRoutes);
app.use('/api/emails-notificacao', emailsNotificacaoRoutes);
app.use('/api/ocorrencias', ocorrenciasRoutes);
app.use('/api/bi', biRoutes);
app.use('/api/pdf-data', pdfDataRoutes);
app.use('/api/pdfs', pdfRoutes);
app.use('/api/superadmin', superadminTenantsRoutes);
app.use('/api/superadmin/help', superadminHelpRoutes);
app.use('/api/tenant', tenantSettingsRoutes);
app.use('/api/help', helpRoutes);
app.use('/api/orcamentos', orcamentosRoutes);
app.use('/api/os-corretiva', osCorretivaRoutes);

app.use('/api', (req, res) => {
  return res.status(404).json({
    message: 'Rota da API nao encontrada.',
  });
});

app.use((err, req, res, next) => {
  console.error('[SERVER_ERROR]', err);

  return res.status(err.status || 500).json({
    message: err.message || 'Erro interno do servidor.',
  });
});

httpServer.listen(PORT, '0.0.0.0', async () => {
  const llm = getLlmRuntimeInfo();

  console.log('======================================================');
  console.log(`SIMEC REAL-TIME ATIVO NA PORTA: ${PORT}`);
  console.log(`FRONTEND_URL: ${FRONTEND_URL}`);
  console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(
    `LLM ativo: provider=${llm.activeProvider} model=${llm.activeModel || 'n/a'} disponivel=${llm.available}`
  );
  console.log('======================================================');

  try {
    await iniciarJobsDeAlertas();
    console.log('Jobs recorrentes de alertas inicializados com sucesso.');
  } catch (error) {
    console.error('Erro ao iniciar jobs de alertas:', error.message);
  }
});

httpServer.timeout = 120000;
