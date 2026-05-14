---
versao: 1.0.0
vigenteDesde: 2026-05-14
documento: politica_privacidade
---

# Política de Privacidade do SIMEC

**Versão 1.0.0 — vigente desde 14 de maio de 2026.**

A presente Política de Privacidade descreve como o **SIMEC** ("Sistema", "nós") trata dados pessoais dos seus usuários, em conformidade com a **Lei nº 13.709/2018 — Lei Geral de Proteção de Dados Pessoais (LGPD)**.

## 1. Quem somos

O SIMEC é um software de gestão de manutenção de equipamentos médico-hospitalares operado pela **Cerdil** (`{{RAZAO_SOCIAL}}`, CNPJ `{{CNPJ}}`, sediada em `{{ENDERECO_COMPLETO}}`).

Atuamos em dois papéis distintos sob a LGPD:

- **Controlador** dos dados pessoais dos nossos próprios usuários e visitantes (ex.: dados de cadastro de quem usa o SIMEC para administrar contas, ofertas, comunicação institucional).
- **Operador** dos dados pessoais que os nossos clientes contratantes (hospitais, clínicas, operadoras de equipamentos) inserem no SIMEC para gerir suas operações de manutenção. Para esses dados, o **controlador é o cliente contratante**, e o SIMEC apenas processa em seu nome, conforme contrato.

## 2. Definições (Art. 5º da LGPD)

- **Dado pessoal:** informação relacionada a pessoa natural identificada ou identificável.
- **Titular:** pessoa natural a quem se referem os dados.
- **Tratamento:** toda operação realizada com dados pessoais (coleta, armazenamento, uso, compartilhamento, eliminação etc.).
- **Controlador:** quem toma as decisões sobre o tratamento.
- **Operador:** quem realiza o tratamento em nome do controlador.
- **Encarregado (DPO):** pessoa indicada para atuar como canal de comunicação entre titulares, controlador e ANPD.

## 3. Quais dados pessoais tratamos

### 3.1 Dados de usuários do SIMEC (sob nossa controladoria)
- Nome, e-mail e senha (armazenada em hash) para acesso ao Sistema.
- Tenant ao qual o usuário está vinculado.
- Logs de acesso e auditoria de ações realizadas (data, hora, IP, ação).

### 3.2 Dados operacionais inseridos pelos clientes (sob controladoria do cliente)
- **Engenheiros e técnicos de campo** identificados em ordens de serviço (próprios da equipe do cliente, do fabricante GE Healthcare ou de prestadores terceiros) — nome completo, função.
- **Solicitantes** de ordens de serviço — nome.
- **Destinatários de notificações** por e-mail e Telegram — nome, e-mail, ID de chat do Telegram.
- **Telefone de suporte** vinculado a equipamentos.

### 3.3 Dados que NÃO tratamos
O SIMEC **não trata dados pessoais sensíveis de pacientes** (CPF, prontuário, exame, diagnóstico, foto, biometria). O escopo do Sistema é exclusivamente técnico-operacional sobre os equipamentos, e em nenhum momento nem mesmo os PDFs importados do portal GE Healthcare contêm dados de pacientes.

## 4. Finalidade do tratamento

| Finalidade | Categoria de dado |
|---|---|
| Autenticação e controle de acesso ao Sistema | Usuários (3.1) |
| Auditoria interna e segurança | Logs (3.1) |
| Gestão de manutenção de equipamentos médicos | Operacionais (3.2) |
| Rastreabilidade técnica de quem realizou cada serviço | Engenheiros, solicitantes (3.2) |
| Envio de notificações operacionais (alertas de equipamento, vencimentos) | Destinatários de notificação (3.2) |
| Análise estatística e geração de insights por inteligência artificial sobre padrões de manutenção | Dados operacionais agregados (3.2) |

## 5. Bases legais (Art. 7º da LGPD)

| Tratamento | Base legal | Artigo |
|---|---|---|
| Cadastro e autenticação de usuários | Execução de contrato | Art. 7º, V |
| Auditoria e segurança | Legítimo interesse | Art. 7º, IX |
| Gestão de manutenção (registro de engenheiros, técnicos e solicitantes) | Execução de contrato + Legítimo interesse para auditoria técnica de equipamento médico | Art. 7º, V e IX |
| Notificações por e-mail/Telegram | Consentimento do titular ao se cadastrar como destinatário | Art. 7º, I |
| Análise por IA para geração de insights | Legítimo interesse, com base em dados pseudonimizados quando possível | Art. 7º, IX |

## 6. Compartilhamento e subprocessadores

O SIMEC utiliza os seguintes subprocessadores para viabilizar a operação:

| Subprocessador | Finalidade | Localização do tratamento |
|---|---|---|
| **Railway, Inc.** | Hospedagem da aplicação e do banco de dados PostgreSQL | Estados Unidos |
| **OpenAI, L.L.C.** | Processamento de linguagem natural (extração de causa-raiz dos relatórios de manutenção e geração de embeddings semânticos) | Estados Unidos |
| **Cloudflare, Inc.** | Armazenamento de anexos enviados pelos usuários (R2) | Multi-região global |
| **Telegram FZ-LLC** | Envio de notificações operacionais ao usuário que opta pelo canal | Multi-região global |
| **GE Healthcare** | Recepção das credenciais do cliente para integração com o portal MyEquipment 360 (operação no Brasil) | Brasil |

A Cerdil mantém contratos ou termos de uso com cada subprocessador exigindo proteção equivalente à LGPD. **Nenhum dado pessoal é vendido ou licenciado para terceiros para fins comerciais alheios à operação do Sistema.**

## 7. Transferência internacional (Arts. 33-36)

Como visto na seção 6, parte do tratamento ocorre fora do Brasil. A Cerdil realiza essas transferências com base no **Art. 33, IX da LGPD** (execução de contrato de que o titular seja parte ou para cumprimento de obrigações inerentes à prestação do serviço), e exige dos subprocessadores cláusulas contratuais padrão que assegurem proteção equivalente à LGPD.

Nenhum dado pessoal sensível é transferido. Quando enviamos texto operacional ao OpenAI para análise por IA, **buscamos minimizar a exposição de dados pessoais** (pseudonimização quando aplicável).

## 8. Retenção

| Categoria | Prazo de retenção | Motivo |
|---|---|---|
| Dados de usuários ativos | Enquanto durar o contrato | Execução do contrato |
| Logs de auditoria e operação | 5 anos | Norma técnica de equipamento médico, defesa em processos |
| Histórico de manutenção (OSs, eventos, PDFs extraídos) | 10 anos | Vida útil padrão do equipamento + obrigações regulatórias |
| Backups | 90 dias | Recuperação operacional |

Após o prazo, os dados são **anonimizados ou eliminados**. Logs estatísticos agregados (sem identificação) podem ser mantidos para fins de melhoria do produto, sem prazo definido.

## 9. Direitos do titular (Art. 18)

O titular pode exercer, a qualquer momento, os seguintes direitos:

- **Confirmação** da existência de tratamento;
- **Acesso** aos dados;
- **Correção** de dados incompletos, inexatos ou desatualizados;
- **Anonimização, bloqueio ou eliminação** de dados desnecessários, excessivos ou tratados em desconformidade;
- **Portabilidade** dos dados a outro fornecedor de serviço;
- **Eliminação** dos dados tratados com consentimento, ressalvadas as hipóteses do Art. 16;
- **Informação** sobre as entidades públicas e privadas com as quais o controlador realizou uso compartilhado;
- **Informação** sobre a possibilidade de não fornecer consentimento;
- **Revogação** do consentimento.

Para exercer qualquer um desses direitos, o titular pode entrar em contato com o Encarregado (seção 12). Solicitações são respondidas em até **15 dias** corridos.

## 10. Segurança (Art. 46)

Adotamos medidas técnicas e administrativas para proteger os dados pessoais, incluindo:

- Senhas armazenadas como hash criptográfico (não em texto puro).
- Autenticação por token JWT com expiração.
- Comunicação criptografada em trânsito (HTTPS/TLS).
- Banco de dados em ambiente protegido (Railway), com backups automáticos.
- Auditoria interna de ações sensíveis.
- Princípio do menor privilégio: usuários têm acesso apenas ao seu tenant.

## 11. Notificação de incidente de segurança (Art. 48)

Em caso de incidente de segurança que possa acarretar risco ou dano relevante aos titulares, a Cerdil **comunicará a ANPD e os titulares afetados em prazo razoável**, em geral em até 72 horas após a ciência do incidente, conforme Resolução ANPD nº 15/2024.

## 12. Encarregado (DPO)

**João Marcos Campanuci**
E-mail: `joao.campanuci022@gmail.com`

(O contato definitivo do Encarregado será atualizado em versões futuras desta Política conforme evolução institucional da Cerdil.)

## 13. Alterações nesta Política

Esta Política pode ser atualizada periodicamente. A versão vigente é sempre a publicada em `/privacidade` no Sistema, com data de vigência indicada no cabeçalho. Em caso de mudanças relevantes, **solicitaremos novo aceite ao usuário** no próximo acesso.

## 14. Legislação aplicável e foro

Esta Política é regida pelas leis brasileiras, em especial pela LGPD (Lei nº 13.709/2018), pelo Marco Civil da Internet (Lei nº 12.965/2014) e pelo Código de Defesa do Consumidor. Fica eleito o foro da comarca de `{{COMARCA}}` para dirimir quaisquer controvérsias.
