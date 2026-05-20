# Scripts operacionais

Scripts ad-hoc usados em migrações pontuais e diagnósticos do banco.
Todos esperam `DATABASE_URL` como variável de ambiente do shell — **nunca**
hardcoded.

## Modelo de execução

```bash
# Windows PowerShell
$env:DATABASE_URL='postgresql://...'; node scripts/<script>.mjs

# bash / WSL / macOS
DATABASE_URL='postgresql://...' node scripts/<script>.mjs
```

## Scripts disponíveis

### `checkBancoSanidade.mjs`

Diagnóstico read-only. Roda alguns SELECTs e mostra: lista de tenants,
total de usuários, superadmins existentes (e o tenant deles), se
`_prisma_migrations` existe + as 8 mais recentes, se a coluna
`tenants.kind` já existe, e contagem de equipamentos/unidades/manutenções.

Use sempre antes de aplicar uma migration pra confirmar que está no
banco certo (qual ambiente, volumes batem).

### `checkDependentesSuperadmin.mjs`

Read-only. Conta quantos registros dependentes os superadmins existentes
têm em tabelas como `log_auditoria`, `alertas_lidos_por_usuario`,
`auth_sessions`, etc. Usado pra avaliar custo de migração de identidade
(vs criar nova).

### `seedTenantSystem.js`

Cria o Tenant System (kind=SYSTEM, slug=system) se não existir e tenta
migrar superadmins legados. **Atenção:** falha por violação de FK
quando os superadmins têm logs/sessões dependentes (caso real do SIMEC).
Para esse cenário use `provisionarSuperadminSystem.mjs`.

### `provisionarSuperadminSystem.mjs`

Fluxo recomendado para promover superadmin para o plano de controle
sem rasgar o histórico de auditoria:

1. Garante existência do Tenant System (cria se não existir).
2. Cria nova identidade de superadmin no Tenant System (idempotente — se
   já existir, atualiza senha/role).
3. Rebaixa role de superadmins legados (que estão em tenants kind=CUSTOMER)
   para `admin`, preservando histórico operacional.
4. Encerra sessões auth ativas dos rebaixados (força re-login).
5. Exibe contagens de confirmação.

```bash
DATABASE_URL='...' \
NOVO_SUPERADMIN_EMAIL='admin@exemplo.com' \
NOVO_SUPERADMIN_USERNAME='admin' \
NOVO_SUPERADMIN_SENHA='...' \
NOVO_SUPERADMIN_NOME='Nome Completo' \
  node scripts/provisionarSuperadminSystem.mjs
```

## Histórico

| Data | Script | Ambiente | Notas |
|---|---|---|---|
| 2026-05-20 | provisionarSuperadminSystem | prod + develop | Setup inicial do plano de controle (Fase 0). admin@simec.local rebaixado. |
