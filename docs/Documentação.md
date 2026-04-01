Documentação Técnica e Funcional do Sistema SIMEC
Versão do Documento: 1.0
Data: 18 de Junho de 2024
Autor: (Análise e Geração por Gemini)
1. Visão Geral e Propósito
O SIMEC é uma aplicação web full-stack projetada para a gestão completa do ciclo de vida de equipamentos clínicos. Ele centraliza informações críticas, automatiza processos de alerta e fornece ferramentas para a gestão de manutenções, contratos e seguros, além de oferecer uma robusta capacidade de auditoria e geração de relatórios.
O principal objetivo do sistema é aumentar a eficiência operacional, garantir a conformidade regulatória, reduzir o tempo de inatividade dos equipamentos e fornecer dados claros para a tomada de decisões estratégicas na área de engenharia clínica.
2. Arquitetura da Aplicação
O sistema é construído sobre uma arquitetura moderna de duas camadas (cliente-servidor), utilizando JavaScript tanto no frontend quanto no backend.
2.1. Backend (Servidor da API)
Stack:
Runtime: Node.js
Framework: Express.js para a gestão de rotas e middlewares.
ORM (Object-Relational Mapping): Prisma, que serve como uma camada de abstração para o banco de dados, garantindo segurança, tipagem e consultas eficientes.
Banco de Dados: PostgreSQL.
Autenticação: JSON Web Tokens (JWT) para proteger os endpoints da API.
Dependências Chave: bcryptjs (para criptografia de senhas), nodemailer (para envio de e-mails), date-fns (para manipulação de datas), multer (para upload de ficheiros).
Estrutura de Pastas (backend-simec/):
prisma/: Contém o schema.prisma (a "planta" do banco de dados) e a pasta migrations (o histórico de alterações da estrutura do banco).
routes/: Define todos os endpoints da API, organizados por recurso (ex: equipamentosRoutes.js, authRoutes.js). Cada rota é responsável por receber as requisições HTTP, validar os dados e chamar os serviços apropriados.
services/: Contém a lógica de negócio principal.
prismaService.js: Cria e exporta uma única instância do Prisma Client, garantindo uma única pool de conexões com o banco.
alertasService.js: O cérebro da automação. Contém as tarefas agendadas que rodam periodicamente para verificar vencimentos, mudar status de manutenções e gerar alertas.
emailService.js: Encapsula a lógica de envio de e-mails, utilizando templates HTML para uma comunicação profissional.
logService.js: Centraliza a função registrarLog para criar registos de auditoria, garantindo um padrão em todo o sistema.
middleware/: Contém os "porteiros" da API.
authMiddleware.js: Exporta as funções proteger (verifica a validade do token JWT) e admin (verifica se o usuário tem permissão de administrador).
uploads/: Pasta onde os ficheiros anexados pelos usuários são armazenados fisicamente.
server.js: O ponto de entrada da aplicação. Orquestra a inicialização, configuração de middlewares, montagem de rotas e o agendador de tarefas (setInterval).
.env: Ficheiro crítico (ignorado pelo Git) que armazena as variáveis de ambiente, como a string de conexão do banco de dados, o segredo do JWT e as credenciais de e-mail.
2.2. Frontend (Aplicação Cliente)
Stack:
Biblioteca: React
Ferramenta de Build: Vite, para um desenvolvimento rápido e otimizado.
Roteamento: React Router DOM, para a navegação entre as páginas.
Chamadas de API: Axios, com interceptadores configurados para injetar o token de autenticação e tratar a expiração de sessão de forma global.
Gerenciamento de Estado: React Context API, para fornecer dados globais (autenticação, alertas, toasts) a todos os componentes que necessitam.
Estilização: CSS puro com variáveis CSS para fácil "theming" (light/dark mode).
Estrutura de Pastas (frontend-simec/):
src/: A raiz do código fonte.
pages/: Componentes "inteligentes" que representam cada página do sistema (ex: DashboardPage.jsx, ManutencoesPage.jsx). São responsáveis por orquestrar a lógica, chamar hooks e renderizar os componentes de UI.
components/: Componentes de UI "burros" e reutilizáveis (ex: BarChart.jsx, ModalConfirmacao.jsx, EquipamentoForm.jsx). Recebem dados e funções via props e não possuem lógica de negócio própria.
hooks/: Hooks customizados (ex: useEquipamentos.js, useAuditoria.js). Encapsulam a lógica complexa de busca, filtragem, ordenação e manipulação de estado para um recurso específico, tornando os componentes de página muito mais limpos.
contexts/: Provedores de estado global (ex: AuthContext.jsx, AlertasContext.jsx). Disponibilizam dados e funções para toda a aplicação.
services/: Contém o ficheiro api.js, que centraliza todas as funções de chamada à API usando a instância configurada do Axios.
utils/: Funções auxiliares puras para tarefas comuns, como formatação de datas (timeUtils.js) e geração de PDFs (pdfUtils.js).
styles/: Todos os ficheiros CSS, organizados por página ou componente.
assets/: Imagens e outros recursos estáticos.
App.jsx: O componente raiz que define a estrutura de roteamento principal.
main.jsx: O ponto de entrada do React, onde a aplicação é renderizada e os provedores de contexto são configurados.
3. Principais Funcionalidades e Fluxos de Trabalho
3.1. Autenticação e Autorização
Fluxo de Login: O usuário insere credenciais na /login. O frontend envia para POST /api/auth/login. O backend verifica o username, compara a senha criptografada com bcrypt.compare, e se for bem-sucedido, gera um token JWT com expiração de 8 horas, retornando-o junto com os dados do usuário. O frontend salva estas informações no Local Storage e redireciona para o dashboard.
Proteção de Rotas: Para cada requisição a um endpoint protegido, o Axios no frontend anexa o token Bearer ... no cabeçalho Authorization. No backend, o middleware proteger intercepta a requisição, verifica a assinatura e a validade do token. Se válido, busca os dados do usuário no banco e os anexa ao objeto req (req.usuario), permitindo que a rota prossiga. Se inválido, retorna um erro 401 Unauthorized.
Controle de Acesso: Rotas que exigem privilégios de administrador (ex: GET /api/users) são adicionalmente protegidas pelo middleware admin, que verifica se req.usuario.role é igual a 'admin'.
3.2. Sistema de Alertas e Notificações
Este é um dos recursos mais complexos e proativos do sistema.
Agendamento: O server.js usa setInterval para executar duas funções principais a cada minuto: atualizarStatusManutencoes e processarAlertasEEnviarNotificacoes.
Mudança de Status (Automação):
atualizarStatusManutencoes verifica manutenções com status Agendada cuja data de início já passou e as atualiza para EmAndamento. Simultaneamente, atualiza o status do equipamento associado para EmManutencao.
A mesma função verifica manutenções EmAndamento cuja data de fim já passou e as atualiza para AguardandoConfirmacao, criando um alerta de alta prioridade na UI para que um gestor tome uma ação.
Geração de Alertas:
processarAlertasEEnviarNotificacoes chama sub-funções para cada tipo de alerta.
Manutenções: Verifica manutenções que estão para iniciar ou terminar em limiares de tempo específicos (ex: 10 min, 60 min) e cria um alerta único para cada limiar.
Contratos e Seguros: Verifica apólices e contratos ativos que vencem nos próximos 30 dias.
Criação na UI: Para cada condição satisfeita, um registro é criado (ou atualizado via upsert) na tabela Alerta.
Notificações por E-mail: A mesma lógica de geração de alertas também verifica os usuários inscritos para receber e-mails daquele tipo. Se uma notificação ainda não foi enviada (verificado na tabela NotificacaoEnviada), o emailService.js é chamado para formatar e enviar o e-mail.
Visualização Individual: A tabela AlertaLidoPorUsuario permite que cada usuário marque um alerta como "Visto" ou o "Dispense" sem afetar a visualização de outros usuários. A API GET /api/alertas calcula este status dinamicamente para o usuário logado.
3.3. Gestão de Entidades (CRUD)
O sistema oferece interfaces completas para gerir Unidades, Equipamentos (com Acessórios e Anexos), Contratos, Seguros, Manutenções e Usuários.
Exemplo de Fluxo (Criar Manutenção):
O usuário vai para a página /manutencoes/agendar.
O ManutencaoForm é renderizado, populando os dropdowns com dados de unidades e equipamentos buscados da API.
O usuário preenche o formulário e submete.
A função handleSave na SalvarManutencaoPage chama a função addManutencao do api.js.
A requisição chega em POST /api/manutencoes.
A rota valida os dados, gera um número de OS único, cria o registro no banco de dados e chama o registrarLog para auditoria.
Uma resposta de sucesso 201 Created é retornada, e o frontend redireciona o usuário para a lista de manutenções, exibindo um toast de sucesso.
3.4. Auditoria e Relatórios
Auditoria: Qualquer operação de escrita (Criação, Edição, Exclusão) em qualquer rota relevante chama a função registrarLog, que insere um registro detalhado na tabela LogAuditoria. A página de auditoria no frontend é altamente performática, usando paginação do lado do servidor para lidar com grandes volumes de dados.
Relatórios: A página de relatórios permite ao usuário selecionar um tipo de relatório e aplicar filtros. Ao submeter, o frontend envia os filtros para POST /api/relatorios/gerar. O backend constrói uma query dinâmica, busca os dados no banco, formata-os e os retorna. O frontend então renderiza os resultados numa tabela e habilita a exportação para PDF, que é gerada no lado do cliente com jspdf e jspdf-autotable.
4. Como Utilizar e Manter
Instalação: Para configurar o ambiente, é necessário ter Node.js e PostgreSQL instalados. Clone o repositório, execute npm install nas pastas backend-simec e frontend-simec. Configure o ficheiro .env no backend com as credenciais do banco e e-mail.
Inicialização do Banco: Execute npx prisma migrate reset --seed no terminal do backend para criar a estrutura do banco e popular com o usuário administrador inicial.
Execução: Inicie o servidor backend (ex: npm run dev) e o servidor de desenvolvimento do frontend (ex: npm run dev).
Manutenção:
Para adicionar um novo campo a um modelo, altere o schema.prisma e execute npx prisma migrate dev --name nome_da_migration para gerar uma nova migration.
A lógica de negócio deve ser adicionada ou modificada primariamente nos ficheiros de services/ no backend.
Novos endpoints são adicionados na pasta routes/ e precisam ser montados no server.js.
Novas páginas no frontend devem ser adicionadas na pasta pages/ e a sua rota configurada no App.jsx. Componentes reutilizáveis devem ser criados na pasta components/.

/simec/  (Pasta Raiz do Projeto no seu computador)
|
├── .git/                            # Pasta oculta do Git, criada após o 'git init'.
|
├── backend-simec/                   # Pasta do projeto Backend (Servidor/API)
│   ├── node_modules/                # (Ignorado pelo Git) Dependências do Node.js.
│   │
│   ├── prisma/
│   │   ├── migrations/              # Contém as migrations que historiam as alterações do DB.
│   │   │   ├── ... (pastas de cada migration)
│   │   │   └── migration_lock.toml
│   │   └── schema.prisma            # O "blueprint" da sua base de dados. Define modelos e relações.
│   │
│   ├── routes/                      # Define todos os endpoints (rotas) da API.
│   │   ├── alertasRoutes.js         # Rotas para /api/alertas (listar, atualizar status).
│   │   ├── auditoriaRoutes.js       # Rota para /api/auditoria (listar logs com filtros).
│   │   ├── authRoutes.js            # Rota para /api/auth/login (autenticação).
│   │   ├── contratosRoutes.js       # Rotas CRUD para /api/contratos.
│   │   ├── dashboardRoutes.js       # Rota BFF para /api/dashboard-data.
│   │   ├── emailsNotificacaoRoutes.js # Rotas CRUD para /api/emails-notificacao.
│   │   ├── equipamentosRoutes.js    # Rotas CRUD para /api/equipamentos e seus sub-recursos (anexos, acessórios).
│   │   ├── manutencoesRoutes.js     # Rotas CRUD para /api/manutencoes e suas ações (concluir, cancelar).
│   │   ├── relatoriosRoutes.js      # Rota para /api/relatorios/gerar.
│   │   ├── segurosRoutes.js         # Rotas CRUD para /api/seguros.
│   │   ├── unidadesRoutes.js        # Rotas CRUD para /api/unidades.
│   │   └── userRoutes.js            # Rotas CRUD para /api/users (gerenciamento de usuários).
│   │
│   ├── services/                    # Contém a lógica de negócio principal e serviços de suporte.
│   │   ├── alertasService.js        # Lógica central de automação, alertas e notificações.
│   │   ├── emailService.js          # Serviço para formatar e enviar e-mails.
│   │   ├── logService.js            # Serviço para registrar logs de auditoria.
│   │   ├── prismaService.js         # Cria e exporta a instância singleton do Prisma Client.
│   │   └── timeService.js           # (Opcional) Serviço para mockar o tempo em desenvolvimento.
│   │
│   ├── middleware/
│   │   └── authMiddleware.js        # Contém os middlewares 'proteger' e 'admin' para segurança das rotas.
│   │
│   ├── uploads/                     # (Ignorado pelo Git) Pasta para onde os ficheiros anexados são salvos.
│   │   ├── equipamentos/
│   │   ├── manutencoes/
│   │   ├── seguros/
│   │   └── unidades/
│   │
│   ├── .env                         # (Ignorado pelo Git) Armazena as variáveis de ambiente (senhas, chaves secretas).
│   ├── .gitignore                   # Diz ao Git para ignorar 'node_modules', '.env', etc.
│   ├── package-lock.json
│   ├── package.json                 # Define os scripts e dependências do backend.
│   ├── seed.js                      # Script para popular o banco de dados com dados iniciais (usuário admin).
│   └── server.js                    # Ponto de entrada da aplicação backend, inicializa o servidor Express.
│
└── frontend-simec/                  # Pasta do projeto Frontend (Aplicação React)
    ├── node_modules/                # (Ignorado pelo Git) Dependências do React e outras bibliotecas.
    │
    ├── public/                      # Ficheiros estáticos públicos.
    │   └── vite.svg
    │
    ├── src/
    │   ├── assets/
    │   │   └── images/
    │   │       ├── logo-simec.png
    │   │       └── logo-simec-base64.js # Logo em formato base64 para PDFs.
    │   │
    │   ├── components/                # Componentes de UI "burros" e reutilizáveis.
    │   │   ├── abas-equipamento/    # Sub-componentes para a página de detalhes do equipamento.
    │   │   │   ├── TabAcessorios.jsx
    │   │   │   ├── TabAnexos.jsx
    │   │   │   ├── TabCadastro.jsx
    │   │   │   └── TabHistorico.jsx
    │   │   ├── AcessorioForm.jsx
    │   │   ├── AdminRoute.jsx         # Protege rotas que só administradores podem aceder.
    │   │   ├── AppLayout.jsx          # Estrutura principal da aplicação (Sidebar, Header).
    │   │   ├── BarChart.jsx
    │   │   ├── ContratoForm.jsx
    │   │   ├── CurrencyInput.jsx
    │   │   ├── DateInput.jsx
    │   │   ├── DonutChart.jsx
    │   │   ├── EmailForm.jsx
    │   │   ├── EquipamentoForm.jsx
    │   │   ├── GlobalFilterBar.jsx
    │   │   ├── ManutencaoForm.jsx
    │   │   ├── Modal.jsx
    │   │   ├── ModalCancelamento.jsx
    │   │   ├── ModalConfirmacao.jsx
    │   │   ├── ProtectedRoute.jsx     # Protege rotas que exigem login.
    │   │   ├── RelatorioResultado.jsx
    │   │   ├── SeguroForm.jsx
    │   │   ├── Sidebar.jsx
    │   │   ├── StatusSelector.jsx
    │   │   ├── TimeInput.jsx
    │   │   ├── Toast.jsx
    │   │   ├── ToastContainer.jsx
    │   │   └── UnidadeForm.jsx
    │   │
    │   ├── contexts/                  # Gerenciamento de estado global.
    │   │   ├── AlertasContext.jsx
    │   │   ├── AuthContext.jsx
    │   │   └── ToastContext.jsx
    │   │
    │   ├── hooks/                     # Hooks customizados para encapsular lógica.
    │   │   ├── useAcessorios.js
    │   │   ├── useAuditoria.js
    │   │   ├── useContratos.js
    │   │   ├── useEquipamentoDetalhes.js
    │   │   ├── useEquipamentos.js
    │   │   ├── useManutencaoDetalhes.js
    │   │   ├── useManutencoes.js
    │   │   ├── useModal.js
    │   │   ├── useSeguros.js
    │   │   └── useUnidades.js
    │   │
    │   ├── pages/                     # Componentes "inteligentes" que representam cada página.
    │   │   ├── AlertasPage.jsx
    │   │   ├── AuditoriaDetalhadaPage.jsx
    │   │   ├── CadastrosGeraisPage.jsx
    │   │   ├── ContratosPage.jsx
    │   │   ├── DashboardPage.jsx
    │   │   ├── DetalhesContratoPage.jsx
    │   │   ├── DetalhesEquipamentoPage.jsx
    │   │   ├── DetalhesManutencaoPage.jsx
    │   │   ├── DetalhesSeguroPage.jsx
    │   │   ├── EmailsNotificacaoPage.jsx
    │   │   ├── EquipamentosPage.jsx
    │   │   ├── GerenciamentoPage.jsx
    │   │   ├── GerenciarUsuariosPage.jsx
    │   │   ├── LogAuditoriaPage.jsx
    │   │   ├── LoginPage.jsx
    │   │   ├── ManutencoesPage.jsx
    │   │   ├── RelatoriosPage.jsx
    │   │   ├── SalvarContratoPage.jsx
    │   │   ├── SalvarEquipamentoPage.jsx
    │   │   ├── SalvarManutencaoPage.jsx
    │   │   ├── SalvarSeguroPage.jsx
    │   │   └── SalvarUnidadePage.jsx
    │   │
    │   ├── services/
    │   │   └── api.js                 # Centraliza todas as chamadas Axios para a API.
    │   │
    │   ├── styles/                    # Ficheiros de estilização CSS.
    │   │   ├── components/            # Estilos para componentes reutilizáveis.
    │   │   ├── pages/                 # Estilos específicos de páginas.
    │   │   ├── global.css
    │   │   └── layout.css
    │   │
    │   ├── utils/
    │   │   ├── pdfUtils.js            # Lógica para gerar PDFs com jsPDF.
    │   │   └── timeUtils.js           # Funções auxiliares para formatar datas e horas.
    │   │
    │   ├── App.jsx                    # Componente raiz do React, define as rotas.
    │   └── main.jsx                   # Ponto de entrada da aplicação, renderiza o App e os Contexts.
    │
    ├── .gitignore                     # Diz ao Git para ignorar 'node_modules', 'dist', etc.
    ├── index.html                     # O ficheiro HTML principal.
    ├── package-lock.json
    ├── package.json                   # Define os scripts e dependências do frontend.
    └── vite.config.js                 # Configurações do Vite.



    📑 DOCUMENTO DE REFERÊNCIA: SISTEMA SIMEC (v1.0)
Este documento descreve a arquitetura, regras de negócio e estrutura técnica do sistema SIMEC (Sistema de Monitoramento de Engenharia Clínica).
🛠️ 1. TECNOLOGIAS (Tech Stack)
Backend: Node.js com Framework Express.
Banco de Dados: PostgreSQL.
ORM: Prisma (Gerenciamento do banco).
Frontend: React (Vite), JavaScript (ES6+).
Estilização: CSS3 Puro (Modularizado).
Segurança: JWT (JSON Web Token) para sessões e Bcrypt para senhas.
Relatórios: jsPDF e jsPDF-AutoTable.
🏗️ 2. ARQUITETURA DO BACKEND (Pasta: backend-simec)
server.js: Ponto de entrada. Gerencia rotas, middlewares e as Tarefas de Fundo (Cron jobs via setInterval) que atualizam status de manutenção e geram alertas automaticamente a cada 1 minuto.
/prisma/schema.prisma: O "coração" do sistema. Define as tabelas:
Unidade, Usuario, Equipamento, Contrato, Manutencao, Acessorio, Seguro, Alerta, LogAuditoria, Ocorrencia, EmailNotificacao.
/routes: Endpoints da API (ex: /api/equipamentos, /api/manutencoes).
/services:
alertasService.js: Lógica complexa de vencimentos e proximidade de datas.
emailService.js: Envio de e-mails via Nodemailer com templates HTML.
logService.js: Registro automático de auditoria (quem fez o quê).
/middleware: Proteção de rotas (apenas usuários logados ou apenas admins).
💻 3. ARQUITETURA DO FRONTEND (Pasta: frontend-simec)
/contexts: Gerenciamento de estado global.
AuthContext: Login, logout e permanência do usuário.
AlertasContext: Busca alertas periodicamente (polling) e gerencia notificações na barra superior.
ToastContext: Exibe pequenas mensagens de sucesso/erro no canto da tela.
/hooks: Lógica de tela separada do visual (ex: useEquipamentos.js cuida de buscar e filtrar os dados).
/components: Componentes reutilizáveis (Gráficos, Formulários, Modais, Inputs com máscara de data/hora/moeda).
/pages: Telas principais do sistema.
/utils: Funções de ajuda (Formatação de data/hora, exportação para PDF e CSV).
📋 4. PRINCIPAIS MÓDULOS E REGRAS DE NEGÓCIO
🏥 Gestão de Unidades e Equipamentos
Equipamentos são vinculados a uma Unidade.
Possuem status: Operante, Inoperante, Em Manutenção, Uso Limitado.
Cadastro inteligente de Patrimônio: Permite marcar como "Sem Patrimônio" (salva o texto, mas valida duplicidade se for um número real).
🔧 Manutenções (Ordens de Serviço - OS)
Fluxo Automático: Uma OS agendada para "agora" muda o status do equipamento para "Em Manutenção" e a OS para "Em Andamento" automaticamente.
Confirmação de Término: Quando o horário de fim agendado chega, a OS vai para "Aguardando Confirmação". O usuário deve clicar se o equipamento ficou "Operante" ou "Inoperante" para finalizar.
Histórico: Cada OS permite anexos e "Notas de Andamento".
⚠️ Sistema de Alertas e Notificações
Vencimentos: Contratos e Seguros geram alertas internos e e-mails com 30, 15, 7 e 1 dia de antecedência.
Visualização Individual: O sistema rastreia qual usuário já viu qual alerta (tabela AlertaLidoPorUsuario). Um usuário pode "Dispensar" um alerta sem afetar os outros.
📝 Ficha Técnica / Ocorrências
Histórico de "vida" do equipamento para eventos menores (ajustes, quedas de energia) que não são necessariamente manutenções preventivas/corretivas.
🛡️ Auditoria
Quase todas as ações (Criar, Editar, Excluir, Concluir) geram um log na tabela LogAuditoria, salvando o autor, a data e o detalhe da alteração.
🚀 5. COMO EXECUTAR O SISTEMA (Para o desenvolvedor)
Backend:
npm install
Configurar .env com DATABASE_URL e JWT_SECRET.
npx prisma db push (Sincronizar banco).
npm run seed (Criar usuário admin inicial: admin / 751953).
npm start.
Frontend:
npm install
Configurar .env com VITE_API_URL.
npm run dev.

📑 DOCUMENTO DE REFERÊNCIA: SISTEMA SIMEC (v1.1)
Este documento descreve a arquitetura, regras de negócio e infraestrutura do sistema SIMEC.
🌐 1. AMBIENTES E HOSPEDAGEM (Railway)
O sistema utiliza integração contínua hospedado no Railway, dividido em dois ambientes:
Produção: Ambiente estável utilizado no dia a dia.
Testes (Staging): Ambiente para validar novas implementações antes da subida oficial.
Configuração: O Backend e o Frontend são serviços distintos no Railway. O Frontend (Vite) consome o Backend via variável de ambiente VITE_API_URL.
🛠️ 2. TECNOLOGIAS (Tech Stack)
Backend: Node.js + Express + Prisma ORM.
Banco de Dados: PostgreSQL (Hospedado no Railway).
Frontend: React (Vite) + JavaScript.
Segurança: JWT para sessões e Bcrypt para senhas.
Notificações: Envio de e-mail via SMTP (Nodemailer).
🏗️ 3. ARQUITETURA TÉCNICA
Backend (backend-simec):
server.js: Orquestrador e executor de tarefas automáticas (tarefas de fundo que rodam a cada 1 min).
schema.prisma: Define as 11 tabelas principais (Unidades, Equipamentos, Manutenções, etc.).
alertasService.js: Lógica de automação de status (Agendada -> Em Andamento -> Aguardando Confirmação).
Frontend (frontend-simec):
AuthContext.jsx & AlertasContext.jsx: Gerenciam o estado global (login e notificações).
api.js: Centraliza todas as chamadas para o servidor.
GlobalFilterBar.jsx: Componente padrão de busca e filtros em todas as telas.
📋 4. REGRAS DE NEGÓCIO CRÍTICAS
Status de Equipamento: O status muda automaticamente com base nas Ordens de Serviço (OS). Se uma OS inicia agora, o equipamento fica "Em Manutenção".
Alertas Individuais: O sistema sabe quem leu qual alerta. Se o Admin 1 marcar como lido, o Admin 2 ainda verá o alerta como novo até que ele mesmo marque como visto.
Patrimônio: Um equipamento pode ser marcado como "Sem Patrimônio". Se tiver número, o sistema impede cadastros duplicados.
Auditoria: Toda criação, edição ou exclusão de dados importantes gera um registro automático na tabela de Auditoria com o nome do autor e a data/hora.
🚀 5. INSTRUÇÕES PARA A IA
Sempre verificar se a alteração exige mudança no schema.prisma (banco de dados).
Sempre incluir o registro de Log de Auditoria em novas funções de criação/edição no backend.
Manter o padrão visual do CSS (variáveis de cor e modo escuro).

📑 DOCUMENTO DE REFERÊNCIA: SISTEMA SIMEC (v2.0 - MASTER)
Este documento descreve o estado atual do sistema SIMEC após a implementação dos módulos de BI, Cards Expansíveis e Automação de Manutenção.
🌐 1. AMBIENTE E HOSPEDAGEM
Hospedagem: Railway (Integração com GitHub).
Ambientes: Produção (Branch main) e Testes (Branch test).
Banco de Dados: PostgreSQL (Prisma ORM).
Frontend: React (Vite) consumindo API via VITE_API_URL.
🛠️ 2. TECNOLOGIAS ATUALIZADAS
Backend: Node.js + Express + Prisma.
Frontend: React + JavaScript + FontAwesome + Chart.js.
Relatórios: jsPDF + jsPDF-AutoTable (Layout em Grade/Grid).
🏗️ 3. NOVIDADES E REGRAS DE NEGÓCIO IMPLEMENTADAS
📋 A. Interface de Cards Expansíveis (UI/UX)
Módulos: Seguros, Equipamentos e Contratos.
Funcionamento: A lista não é mais uma tabela rígida. Cada item é um Card. Ao clicar no ícone (+), o card expande para mostrar detalhes sem mudar de página.
Equipamentos: Dentro do card expandido, existe um sistema de abas internas (Cadastro, Acessórios, Anexos e Histórico).
Cores Semânticas: O cabeçalho do card muda de cor automaticamente baseando-se no status (Verde: Operante/Ativo, Vermelho: Inoperante/Vencido, Amarelo: Atenção/Vencendo em breve).
📈 B. Business Intelligence (BI) e Indicadores
Página de BI: Nova tela com indicadores anuais de performance.
Métricas:
Downtime (Tempo de Parada): Soma das horas reais de indisponibilidade (Preventiva + Corretiva).
Frequência de Falhas: Ranking de equipamentos que mais geram corretivas.
Performance por Unidade: Gráfico comparando quais hospitais têm mais tempo de máquina parada.
Impressão: Relatório Executivo em PDF formatado em grade profissional.
🔧 C. Ciclo de Vida da Manutenção (Automação)
Início Automático: Quando uma OS agendada atinge o horário, o sistema muda o status para "Em Andamento" e carimba o Horário de Início Real automaticamente (campo travado para edição).
Preenchimento Ágil: Descrição do serviço é opcional para Preventivas (salva texto padrão se vazio).
Fechamento Auditado: Para concluir uma OS, o sistema obriga a informar a Data/Hora Real de Término. Se continuar inoperante, o sistema exige um motivo e uma nova data de previsão, registrando tudo no histórico.
🔔 D. Sistema de Alertas Blindado
Controle Individual: O sistema sabe qual usuário já viu qual alerta.
Alertas Obrigatórios: Alertas de "Confirmação Pendente" (manutenção que terminou o prazo) ficam travados no sino. O usuário não consegue dar baixa manual neles; o alerta só some quando a OS é devidamente finalizada na tela de detalhes.
Ordem de Urgência: A lógica de vencimento de contratos/seguros prioriza os prazos menores (1 dia, 7 dias) antes dos maiores (30 dias).
📂 E. Gestão de Documentos Digitais
Anexos: Implementado upload e download de arquivos PDF/Imagens diretamente nos cards de Seguros e Contratos.
Sinalização Visual: Ícone de clipe no cabeçalho do card (Verde: Com anexo, Cinza: Sem anexo).
Higiene do Servidor: Ao excluir um registro ou anexo, o arquivo físico é apagado da pasta uploads no Railway.
💾 4. ESTRUTURA DE ARQUIVOS CRÍTICA
backend-simec/prisma/schema.prisma: Modelo Seguro com campos de valores LMI.
backend-simec/routes/biRoutes.js: Cálculos matemáticos dos indicadores.
backend-simec/services/alertasService.js: Motor de automação de status e alertas.
frontend-simec/src/App.jsx: Importação estática do BIPage para evitar erros de definição.
frontend-simec/src/utils/pdfUtils.js: Central de geração de PDFs (Auditoria, Relatórios e BI).