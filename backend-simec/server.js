// Ficheiro: simec/backend-simec/server.js
// Versão: 3.2 (Sênior - Com log de depuração de ambiente)
// Descrição: Ponto de entrada principal do servidor da API do SIMEC.
//            Orquestra a configuração, middlewares, rotas e tarefas agendadas.

// --- 1. Configuração de Ambiente ---
// Carrega as variáveis de ambiente do ficheiro .env para process.env. Essencial para segurança.
import dotenv from 'dotenv';
dotenv.config();

// ==========================================================================
// >> LOG DE DEPURAÇÃO CRÍTICO <<
// Imprime a URL do banco de dados que o servidor está efetivamente a usar.
// Compare esta saída no seu terminal com o conteúdo do seu ficheiro .env.
console.log("======================================================");
console.log("INICIANDO SERVIDOR... VARIÁVEL DE AMBIENTE LIDA:");
console.log("DATABASE_URL:", process.env.DATABASE_URL);
console.log("======================================================");
// ==========================================================================

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

// --- 4. Importação dos Serviços e Middlewares ---
import { atualizarStatusManutencoes, processarAlertasEEnviarNotificacoes } from './services/alertasService.js';
import { proteger } from './middleware/authMiddleware.js';

// --- 5. Configuração de Caminhos e Variáveis ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);});
  
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

// --- ROTAS PROTEGIDAS ---
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


// --- 9. Rota Raiz e Tarefas Agendadas ---
app.get('/', (req, res) => {
  res.send('API do SIMEC está a funcionar!');
});

const executarTarefasDeFundo = async () => {
  console.log(`[${new Date().toLocaleTimeString('pt-BR')}] Executando tarefas de fundo...`);
  try {
    // 1. PRIMEIRO, verificamos o que está próximo de acontecer e geramos os alertas.
    await processarAlertasEEnviarNotificacoes();
    
    // 2. DEPOIS, atualizamos o status do que já deveria ter acontecido.
    await atualizarStatusManutencoes();

  } catch (err) {
    console.error('[ERRO FATAL NA TAREFA AUTOMÁTICA]:', err);
  }
};

const checkIntervalMs = 60 * 1000; // 1 minuto
setInterval(executarTarefasDeFundo, checkIntervalMs);

// --- 10. Inicialização do Servidor ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor backend a rodar na porta ${PORT}`);
  
  // Executa a verificação inicial na ordem correta também.
  console.log('Executando verificação inicial de tarefas...');
  executarTarefasDeFundo();
});