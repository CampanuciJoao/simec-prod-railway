// Ficheiro: simec/backend-simec/server.js
// Versão: 3.7 (Sênior - Integração com Fila BullMQ para Processamento em Background)

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
import agentRoutes from './routes/agentRoutes.js'; 

// --- 4. Importação dos Serviços, Middlewares e Fila ---
import { 
    atualizarStatusManutencoes, 
    processarAlertasEEnviarNotificacoes, 
    processarSaudeEquipamentos 
} from './services/alertasService.js';
import { proteger } from './middleware/authMiddleware.js';
import { alertasQueue } from './services/queueService.js'; // Nova importação da fila

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

// --- 9. Rota Raiz ---
app.get('/', (req, res) => {
  res.send('API do SIMEC está ativa e operante!');
});

// A função de automação agora é disparada pelo Worker via BullMQ (configurado no queueService.js)
// Por isso, removemos o 'setInterval' daqui para evitar duplicação de processamento.

// --- 10. Inicialização do Servidor ---
const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`------------------------------------------------------`);
  console.log(`✅ Servidor rodando na porta: ${PORT}`);
  console.log(`🔗 Banco de Dados Conectado com Sucesso`);
  console.log(`🚀 Sistema de Filas (BullMQ) Inicializado`);
  console.log(`------------------------------------------------------`);
  
  // Limpa filas pendentes de execuções anteriores e agenda a tarefa recorrente
  await alertasQueue.obliterate({ force: true });
  await alertasQueue.add('verificar-tarefas-diarias', {}, { 
      repeat: { every: 60000 } // Executa as tarefas a cada 1 minuto
  });
});

server.timeout = 120000;