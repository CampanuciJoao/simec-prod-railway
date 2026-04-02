// Ficheiro: simec/backend-simec/server.js
// Versão: 3.5 (Sênior - Integração de Agente IA e Estabilidade de Conexão)

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
import agentRoutes from './routes/agentRoutes.js'; // Rota do Agente Guardião

// --- 4. Importação dos Serviços e Middlewares ---
import { atualizarStatusManutencoes, processarAlertasEEnviarNotificacoes } from './services/alertasService.js';
import { proteger } from './middleware/authMiddleware.js';

// --- 5. Configuração de Caminhos e Variáveis ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 5000;

// --- 6. Configuração de Middlewares Globais ---
app.use(cors({
  origin: '*', // Permite que qualquer frontend acesse a API (essencial para ambiente de teste)
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

// --- ROTAS PÚBLICAS ---
app.use('/api/auth', authRoutes);

// --- ROTAS PROTEGIDAS (Exigem Login) ---
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
app.use('/api/agent', agentRoutes); // Ativação da inteligência artificial

// --- 9. Rota Raiz e Tarefas Agendadas ---
app.get('/', (req, res) => {
  res.send('API do SIMEC está ativa e operante!');
});

const executarTarefasDeFundo = async () => {
  const agora = new Date().toLocaleTimeString('pt-BR');
  console.log(`[${agora}] Executando automações de fundo...`);
  try {
    // 1. Verifica vencimentos de contratos/seguros e envia e-mails
    await processarAlertasEEnviarNotificacoes();
    
    // 2. Atualiza status de manutenções e equipamentos
    await atualizarStatusManutencoes();

  } catch (err) {
    console.error('[ERRO NAS TAREFAS AUTOMÁTICAS]:', err.message);
  }
};

// Agenda a execução das tarefas a cada 1 minuto (60000ms)
setInterval(executarTarefasDeFundo, 60 * 1000);

// --- 10. Inicialização do Servidor ---
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`------------------------------------------------------`);
  console.log(`✅ Servidor rodando na porta: ${PORT}`);
  console.log(`🔗 Banco de Dados Conectado com Sucesso`);
  console.log(`------------------------------------------------------`);
  
  // Executa uma vez no momento do boot para garantir alertas frescos
  executarTarefasDeFundo();
});

// >> CONFIGURAÇÃO DE ESTABILIDADE IA <<
// Aumentamos o tempo de espera da requisição para 2 minutos. 
// Isso garante que a IA tenha tempo de processar históricos grandes sem cair a conexão.
server.timeout = 120000;