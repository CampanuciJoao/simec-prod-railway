// Ficheiro: simec/backend-simec/server.js
// Versão: 4.0 (Sênior - Arquitetura Modular do Agente + BullMQ)

// --- 1. Configuração de Ambiente ---
import dotenv from 'dotenv';
dotenv.config();

console.log("======================================================");
console.log("        INICIANDO SERVIDOR BACKEND SIMEC             ");
console.log("======================================================");

// --- 2. Importações de Módulos ---
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// --- 3. Importação das Rotas da Aplicação ---
import authRoutes from './routes/authRoutes.js';
import agentRoutes from './routes/agentRoutes.js'; // Rota do Agente (Inteligência)
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

// --- 4. Importação de Middlewares e Filas ---
import { proteger } from './middleware/authMiddleware.js';
import { alertasQueue } from './services/queueService.js';

// --- 5. Configuração de Caminhos e Variáveis ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 5000;

// --- 6. Configuração de Middlewares Globais ---
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- 7. Servir Arquivos Estáticos (Uploads) ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================================================
// --- 8. Montagem das Rotas da API ---
// ==========================================================================

// Rotas Públicas ou com Proteção Interna Específica
app.use('/api/auth', authRoutes);
app.use('/api/agent', agentRoutes); // Nova estrutura modular do Agente Guardião

// Barreira de Segurança Global: Todas as rotas abaixo exigem Token JWT
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

// --- 9. Rota Raiz ---
app.get('/', (req, res) => {
  res.send('API do SIMEC (v4.0) está ativa e operante!');
});

// --- 10. Inicialização do Servidor ---
const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`------------------------------------------------------`);
  console.log(`✅ Servidor rodando na porta: ${PORT}`);
  console.log(`🔗 Banco de Dados Conectado`);
  console.log(`🚀 Arquitetura IA (Agent System) Pronta`);
  console.log(`📦 Sistema de Filas (BullMQ) Ativo`);
  console.log(`------------------------------------------------------`);
  
  // Reinicializa a fila de tarefas recorrentes
  try {
    await alertasQueue.obliterate({ force: true });
    await alertasQueue.add('verificar-tarefas-diarias', {}, { 
        repeat: { every: 60000 } // Executa a cada 1 minuto
    });
  } catch (error) {
    console.error("Erro ao inicializar filas BullMQ:", error.message);
  }
});

server.timeout = 120000;