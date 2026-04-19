# Arquitetura do SIMEC

## Direção adotada
- Monólito modular com fronteiras por domínio.
- Multi-tenant obrigatório em toda regra de negócio e persistência.
- Rotas HTTP finas, serviços com regra de negócio, repositories com Prisma e adapters para payloads públicos.

## Convenções do backend
- `routes/*`: apenas parsing HTTP, auth, validação e serialização de resposta.
- `services/<dominio>/*Service.js`: orquestra casos de uso e retorna `{ ok, status?, data?, message? }`.
- `services/<dominio>/*Repository.js`: concentra consultas Prisma.
- `services/<dominio>/*Adapter.js`: adapta payload interno para contrato público da API.
- Prisma não deve ser acessado diretamente em `routes/*`.

## Convenções de contrato front/back
- Toda API usada pelo frontend deve existir explicitamente no backend.
- Endpoints novos devem documentar payload de sucesso e erro.
- Erros devem seguir o shape `{ message: string }` nas respostas HTTP.
- Conflitos de negócio devem retornar `409` com mensagem clara.

## Convenções do frontend
- `services/api/*`: gateway HTTP por domínio.
- `hooks/*`: comportamento e estado da tela.
- `components/*`: composição visual.
- `utils/*`: transformação pura e helpers reaproveitáveis.

## Alvos de consolidação já aplicados
- `alertas`, `auth` e `dashboard` migrados para fluxo com service/repository/adapter.
- API órfã `registrarUsuario` removida do frontend.
- Duplicação de BI consolidada para `src/utils/bi/*`.
- Código morto de realtime legado deve permanecer fora da aplicação ativa.
