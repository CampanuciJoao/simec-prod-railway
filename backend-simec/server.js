// Ficheiro: simec/backend-simec/server.js
// Versão: 3.3 (Sênior - Estabilizado com Rota BI e Limpeza de Listeners)

// --- 1. Configuração de Ambiente ---
import dotenv from 'dotenv';
dotenv.config();

console.log("======================================================");
console.log("INICIANDO SERVIDOR... VARIÁVEL DE AMBIENTE LIDA:");
console.log("DATABASE_URL:", process.env.DATABASE_URL);
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
import biRoutes from './routes/biRoutes.js'; // <<< Rota de BI incluída

// --- 4. Importação dos Serviços e Middlewares ---
import { atualizarStatusManutencoes, processarAlertasEEnviarNotificacoes } from './services/alertasService.js';
import { proteger } from './middleware/authMiddleware.js';

// --- 5. Configuração de Caminhos e Variáveis ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 5000;

// --- 6. Configuração de Middlewares Globais ---
app.use(cors());
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
app.use('/api/bi', biRoutes); // <<< Ativação da rota de BI

// --- 9. Rota Raiz e Tarefas Agendadas ---
app.get('/', (req, res) => {
  res.send('API do SIMEC está a funcionar!');
});

const executarTarefasDeFundo = async () => {
  console.log(`[${new Date().toLocaleTimeString('pt-BR')}] Executando tarefas de fundo...`);
  try {
    // 1. Verifica vencimentos e envia e-mails
    await processarAlertasEEnviarNotificacoes();
    
    // 2. Atualiza status de equipamentos em manutenção
    await atualizarStatusManutencoes();

  } catch (err) {
    console.error('[ERRO NAS TAREFAS AUTOMÁTICAS]:', err);
  }
};

// Agenda a execução das tarefas a cada 1 minuto
const checkIntervalMs = 60 * 1000; 
setInterval(executarTarefasDeFundo, checkIntervalMs);

// --- 10. Inicialização Única do Servidor ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`------------------------------------------------------`);
  console.log(`✅ Servidor backend rodando na porta ${PORT}`);
  console.log(`🚀 Executando verificação inicial de tarefas...`);
  console.log(`------------------------------------------------------`);
  
  // Executa uma vez no momento em que o servidor liga
  executarTarefasDeFundo();
});