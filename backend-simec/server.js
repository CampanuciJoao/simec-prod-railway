import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import os from 'os';

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
import biRoutes from './routes/biRoutes.js';
import pdfDataRoutes from './routes/pdfDataRoutes.js';
import pdfRoutes from './routes/pdfRoutes.js';
import superadminTenantsRoutes from './routes/superadminTenantsRoutes.js';
import tenantSettingsRoutes from './routes/tenantSettingsRoutes.js';
import helpRoutes from './routes/helpRoutes.js';
import superadminHelpRoutes from './routes/superadminHelpRoutes.js';
import orcamentosRoutes from './routes/orcamentosRoutes.js';
import osCorretivaRoutes from './routes/osCorretivaRoutes.js';
import gehcRoutes from './routes/gehcRoutes.js';
import gehcAprendizadoRoutes from './routes/gehcAprendizadoRoutes.js';
import alertConfigRoutes from './routes/alertConfigRoutes.js';
import telegramRoutes from './routes/telegramRoutes.js';
import telegramWebhookRoute from './routes/telegramWebhookRoute.js';
import lgpdRoutes from './routes/lgpdRoutes.js';
import controleQualidadeRoutes from './routes/controleQualidadeRoutes.js';
import metricsRoutes from './routes/metricsRoutes.js';
import saudeRoutes from './routes/saudeRoutes.js';
import superadminImpersonacaoRoutes from './routes/superadminImpersonacaoRoutes.js';
import superadminUsuariosRoutes from './routes/superadminUsuariosRoutes.js';
import superadminAuditoriaRoutes from './routes/superadminAuditoriaRoutes.js';

import cookieParser from 'cookie-parser';
import { metricsMiddleware } from './middleware/metricsMiddleware.js';
import { aplicarRedisAdapter } from './services/realtime/socketRedisAdapter.js';

import { proteger } from './middleware/authMiddleware.js';
import { getLlmRuntimeInfo } from './services/ai/llmService.js';
import { iniciarJobsDeAlertas } from './services/queueService.js';
import { getFromR2 } from './services/uploads/fileStorageService.js';
import prisma from './services/prismaService.js';

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

if (FRONTEND_URL === '*' && process.env.NODE_ENV === 'production') {
  console.error('[CORS] FRONTEND_URL="*" nao e permitido em producao com credentials:true.');
  process.exit(1);
}
// Suporta m�ltiplas origens separadas por v�rgula: 'https://a.com,https://b.com'
const corsOrigin =
  FRONTEND_URL === '*'
    ? true
    : FRONTEND_URL.includes(',')
    ? FRONTEND_URL.split(',').map((u) => u.trim())
    : FRONTEND_URL;

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

global.io = io;

// Plugga o Redis adapter pra permitir múltiplas instâncias do backend
// compartilharem eventos em tempo real. Não bloqueia o boot — se Redis
// estiver indisponível, cai pro adapter in-memory.
aplicarRedisAdapter(io).catch((err) => {
  console.warn('[SOCKET_ADAPTER] Falha inesperada ao aplicar adapter:', err?.message || err);
});

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
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Security headers (manual equivalent of helmet.js)
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'DENY');
  res.set('X-XSS-Protection', '0'); // modern browsers ignore this; CSP is the real guard
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none';"
  );
  res.removeHeader('X-Powered-By');
  next();
});

// Request timing — loga requests lentos (setHeader não pode ser chamado no evento finish)
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1_000_000;
    if (ms > 2000) {
      console.warn(`[SLOW_REQUEST] ${req.method} ${req.originalUrl} — ${ms.toFixed(0)}ms`);
    }
  });
  next();
});

app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(metricsMiddleware);

// Prometheus scrape endpoint — sem auth. Restrinja via proxy/firewall
// se for exposto publicamente em produção.
app.use('/metrics', metricsRoutes);

app.get('/', (req, res) => {
  res.send('API do SIMEC ativa e operante em tempo real!');
});

app.get('/api/health', (req, res) => {
  const uptimeSeconds = process.uptime();
  res.json({
    status: 'ok',
    uptime: uptimeSeconds,
    memory: process.memoryUsage(),
    load: os.loadavg(),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/telegram/webhook', telegramWebhookRoute);
// LGPD: documentos legais (publicos) + aceites (proteger interno na rota)
app.use('/api/lgpd', lgpdRoutes);

app.use(proteger);

// Endpoint protegido de arquivos — autenticação + validação de tenant obrigatórias
app.get('/uploads/*path', async (req, res) => {
  const key = 'uploads/' + req.params.path;
  try {
    const anexo = await prisma.anexo.findFirst({
      where: { path: key, tenantId: req.usuario.tenantId },
      select: { id: true },
    });

    if (!anexo) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const obj = await getFromR2(key);
    res.set('Content-Type', obj.ContentType || 'application/octet-stream');
    obj.Body.pipe(res);
  } catch {
    res.status(404).json({ error: 'Arquivo não encontrado.' });
  }
});

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
app.use('/api/bi', biRoutes);
app.use('/api/pdf-data', pdfDataRoutes);
app.use('/api/pdfs', pdfRoutes);
app.use('/api/superadmin', superadminTenantsRoutes);
app.use('/api/superadmin/help', superadminHelpRoutes);
app.use('/api/superadmin/saude', saudeRoutes);
app.use('/api/superadmin/impersonar', superadminImpersonacaoRoutes);
app.use('/api/superadmin/usuarios', superadminUsuariosRoutes);
app.use('/api/superadmin/auditoria', superadminAuditoriaRoutes);
app.use('/api/tenant', tenantSettingsRoutes);
app.use('/api/help', helpRoutes);
app.use('/api/orcamentos', orcamentosRoutes);
app.use('/api/os-corretiva', osCorretivaRoutes);
app.use('/api/gehc/aprendizado', gehcAprendizadoRoutes);
app.use('/api/gehc', gehcRoutes);
app.use('/api/alert-config', alertConfigRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/controle-qualidade', controleQualidadeRoutes);

app.use('/api', (req, res) => {
  console.warn(`[404] ${req.method} ${req.originalUrl} — rota não encontrada`);
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
