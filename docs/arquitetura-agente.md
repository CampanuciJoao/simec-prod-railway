# Arquitetura do agente SIMEC

## Estado atual

O agente atual do SIMEC ja tem uma base reaproveitavel e melhor do que um chatbot monolitico:

- `backend-simec/services/agent/router/router.js` centraliza intencoes e continuidade de sessao.
- `backend-simec/services/agent/agendamento` concentra o fluxo conversacional com estado, validacoes e persistencia.
- `backend-simec/services/agent/relatorio` e `backend-simec/services/agent/seguro` ja seguem um padrao de servico por dominio.
- `AgentSession`, `AgentMessage` e `UserAgentMemory` no Prisma deixam o sistema pronto para memoria conversacional e auditoria.
- `entityResolver` e os adaptadores de consulta reaproveitam bem o dominio hospitalar e o contexto multi-tenant.

## O que vale reaproveitar

- Sessoes e memoria por usuario/tenant.
- Roteamento por intencao e acao contextual.
- Servicos por dominio (`agendamento`, `relatorio`, `seguro`).
- Heuristicas de fallback para classificacao e extracao.
- Resolvedor de entidades hospitalares com sinonimos e ambiguidade.

## O que precisava melhorar

- A integracao com IA estava acoplada diretamente ao Gemini em arquivos de dominio.
- Nao existia camada de provedor para alternar entre OpenAI, Gemini e futuros motores.
- Ainda nao havia uma borda clara para integracoes externas como PACS.
- O caminho para ML futuro ficava implicito, mas nao modelado em contratos de servico.

## Refatoracao aplicada

Foi criada uma camada de IA em `backend-simec/services/ai`:

- `config.js`: resolve provider e modelos por ambiente.
- `llmService.js`: expoe a API unificada usada pelo agente.
- `providers/openaiProvider.js`: integra com a OpenAI via `Responses API`.
- `providers/geminiProvider.js`: preserva compatibilidade com o fluxo anterior.
- `providers/noopProvider.js`: permite fallback seguro para heuristica.

Os pontos que dependiam diretamente do Gemini agora usam a camada comum:

- `services/agent/shared/intentClassifier.js`
- `services/agent/agendamento/extractor/iaExtractor.js`

## Base pronta para PACS

Foi criado `backend-simec/services/integrations/pacs/pacsClient.js` como contrato inicial de integracao. A ideia e manter o PACS fora do nucleo conversacional:

- o agente decide a intencao,
- uma camada de aplicacao chama o cliente PACS,
- e um presenter adapta o retorno para a conversa.

Isso evita que o agente vire um arquivo gigante com regra de negocio, HTTP e prompt misturados.

## Como evoluir daqui

1. Adicionar um novo dominio `services/agent/pacs` com `parser`, `queries`, `presenter`, `payload` e `session`.
2. Criar um registro de ferramentas do agente para consultar PACS, relatorios, seguros e OS de forma padronizada.
3. Persistir memoria semantica ou embeddings em uma tabela/servico separado, sem misturar com `UserAgentMemory`.
4. Introduzir uma camada de recomendacao/ML para scoring, priorizacao e sugestao, deixando o LLM apenas como orquestrador e interface.
5. Expor configuracoes por ambiente:
   - `AI_PROVIDER=openai`
   - `OPENAI_API_KEY=...`
   - `OPENAI_MODEL=gpt-4.1-mini`
   - `GEMINI_API_KEY=...` (fallback opcional)
   - `PACS_API_URL=...`
   - `PACS_API_KEY=...`

## Direcao recomendada

Para o teu cenario, a melhor direcao e:

- OpenAI como provider principal.
- Gemini apenas como fallback temporario, se voce quiser manter redundancia.
- PACS entrando como integracao modular por ferramenta/dominio.
- ML futuro como camada de decisao assistiva, nao misturada com prompts e roteamento.
