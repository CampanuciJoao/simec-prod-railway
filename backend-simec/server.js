import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Rotas
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

// Middlewares / serviços
import { proteger } from './middleware/authMiddleware.js';
import { iniciarJobsDeAlertas } from './services/queueService.js';

// Inicializa o worker
import './worker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || '*';

/**
 * Socket.IO
 */
const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_URL === '*' ? '*' : FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
});

global.io = io;

io.on('connection', (socket) => {
  console.log(`🔌 Novo navegador conectado ao SIMEC: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`🔌 Navegador desconectado do SIMEC: ${socket.id}`);
  });
});

/**
 * Middlewares globais
 */
app.use(
  cors({
    origin: FRONTEND_URL === '*' ? '*' : FRONTEND_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Arquivos estáticos
 */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/**
 * Health check
 */
app.get('/', (req, res) => {
  res.send('API do SIMEC ativa e operante em tempo real!');
});

/**
 * Rotas públicas
 */
app.use('/api/auth', authRoutes);
app.use('/api/agent', agentRoutes);

/**
 * Rotas protegidas
 */
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

/**
 * 404 da API
 */
app.use('/api', (req, res) => {
  return res.status(404).json({
    message: 'Rota da API não encontrada.',
  });
});

/**
 * Tratador global de erro do Express
 */
app.use((err, req, res, next) => {
  console.error('[SERVER_ERROR]', err);

  return res.status(err.status || 500).json({
    message: err.message || 'Erro interno do servidor.',
  });
});

/**
 * Inicialização do servidor
 */
httpServer.listen(PORT, '0.0.0.0', async () => {
  console.log('======================================================');
  console.log(`✅ SIMEC REAL-TIME ATIVO NA PORTA: ${PORT}`);
  console.log(`🌐 FRONTEND_URL: ${FRONTEND_URL}`);
  console.log(`🛠️ Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log('======================================================');

  try {
    await iniciarJobsDeAlertas();
    console.log('⏰ Agendador de alertas inicializado com sucesso.');
  } catch (error) {
    console.error('❌ Erro ao iniciar agendador de alertas:', error.message);
  }
});

/**
 * Timeout do servidor HTTP
 */
httpServer.timeout = 120000;