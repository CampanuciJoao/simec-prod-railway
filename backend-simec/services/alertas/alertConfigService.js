/**
 * Serviço central de configuração de alertas.
 *
 * Cada módulo (GEHC, MANUTENCAO, ...) declara seus DEFAULTS aqui.
 * Tenants podem sobrescrever parcialmente via alert_configs no banco.
 * O resultado efetivo é sempre merge(DEFAULTS[module], DB.config).
 */

import prisma from '../prismaService.js';
import { registrarLog } from '../logService.js';
import {
  validarAlertConfigPayload,
  getModuleSchema,
  listarModulosSuportados,
} from '../../validators/alertConfigValidator.js';

// ── Defaults por módulo ─────────────────────────────────────────────────────
//
// GEHC: thresholds históricos do gehcAlertRepository. Mantidos aqui como
// fonte única de verdade. O repository legado importa daqui (compat).

export const DEFAULTS = {
  GEHC: {
    heliumWarn:          70,
    heliumCritical:      30,
    tempWarn:            18,
    tempCritical:        25,
    flowMin:             1.5,
    pressureMin:         0.8,
    pressureMax:         1.5,
    pressureCriticalMax: 2.0,
  },
};

// ── Cache in-memory por processo ───────────────────────────────────────────
// TTL curto para refletir alterações sem hit constante no banco. Cada
// processo (server + workers) tem seu próprio cache; aceitável dado o TTL.

const CACHE_TTL_MS = 60 * 1000;
const cache = new Map(); // key: `${tenantId}:${module}` → { value, expiresAt }

function cacheKey(tenantId, module) {
  return `${tenantId}:${module}`;
}

function cacheGet(tenantId, module) {
  const k = cacheKey(tenantId, module);
  const hit = cache.get(k);
  if (hit && hit.expiresAt > Date.now()) return hit.value;
  if (hit) cache.delete(k);
  return null;
}

function cacheSet(tenantId, module, value) {
  cache.set(cacheKey(tenantId, module), {
    value,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

function cacheInvalidate(tenantId, module) {
  cache.delete(cacheKey(tenantId, module));
}

// ── API pública ────────────────────────────────────────────────────────────

/**
 * Retorna a configuração efetiva (merge defaults + override do tenant).
 * Sempre retorna um objeto válido para `module`; jamais lança se o módulo existe.
 */
export async function getConfig(tenantId, module) {
  if (!DEFAULTS[module]) throw new Error(`Módulo de alertas desconhecido: ${module}`);
  if (!tenantId)         return { ...DEFAULTS[module] };

  const cached = cacheGet(tenantId, module);
  if (cached) return cached;

  let override = {};
  let meta = null;
  try {
    const row = await prisma.alertConfig.findUnique({
      where: { tenantId_module: { tenantId, module } },
    });
    if (row) {
      override = row.config || {};
      meta = { updatedAt: row.updatedAt, updatedBy: row.updatedBy };
    }
  } catch (err) {
    // Em caso de falha no DB, degrade graciosamente para defaults.
    console.error('[ALERT_CONFIG_SERVICE_ERROR] getConfig falhou:', err.message);
  }

  const effective = { ...DEFAULTS[module], ...override };
  effective.__meta = meta;
  cacheSet(tenantId, module, effective);
  return effective;
}

/**
 * Aplica um patch parcial à configuração do tenant.
 * - Valida via alertConfigValidator (tipo, range, regras cruzadas).
 * - Salva merge no banco.
 * - Invalida cache local.
 * - Registra log de auditoria com o diff legível.
 *
 * Retorna { ok, errors, config }.
 */
export async function setConfig(tenantId, module, partial, usuarioId) {
  if (!DEFAULTS[module]) {
    return { ok: false, errors: [`Módulo desconhecido: ${module}.`], config: null };
  }
  if (!tenantId)  return { ok: false, errors: ['Tenant ausente.'], config: null };
  if (!usuarioId) return { ok: false, errors: ['Usuário ausente.'], config: null };

  const current = await getConfig(tenantId, module);
  const validation = validarAlertConfigPayload(module, partial, current);
  if (!validation.ok) {
    return { ok: false, errors: validation.errors, config: null };
  }

  const merged = { ...current, ...validation.sanitized };
  // Limpa metadados antes de persistir
  delete merged.__meta;

  try {
    await prisma.alertConfig.upsert({
      where:  { tenantId_module: { tenantId, module } },
      update: { config: merged, updatedBy: usuarioId },
      create: { tenantId, module, config: merged, updatedBy: usuarioId },
    });
  } catch (err) {
    console.error('[ALERT_CONFIG_SERVICE_ERROR] setConfig persistência falhou:', err);
    return { ok: false, errors: ['Falha ao salvar configuração.'], config: null };
  }

  cacheInvalidate(tenantId, module);

  // Auditoria — diff legível
  const diffLinhas = [];
  const schema = getModuleSchema(module);
  for (const [k, v] of Object.entries(validation.sanitized)) {
    const antes  = current[k];
    const depois = v;
    if (antes !== depois) {
      const label = schema?.fields?.[k]?.label || k;
      diffLinhas.push(`${label}: ${antes} → ${depois}`);
    }
  }
  await registrarLog({
    tenantId,
    usuarioId,
    acao: 'EDIÇÃO',
    entidade: 'ConfiguracaoAlertas',
    entidadeId: module,
    detalhes: diffLinhas.length
      ? `Configuração de alertas ${module} atualizada — ${diffLinhas.join('; ')}.`
      : `Configuração de alertas ${module} salva sem alterações efetivas.`,
  });

  return { ok: true, errors: [], config: await getConfig(tenantId, module) };
}

/**
 * Restaura os defaults para o tenant (apaga o override).
 */
export async function resetConfig(tenantId, module, usuarioId) {
  if (!DEFAULTS[module]) {
    return { ok: false, errors: [`Módulo desconhecido: ${module}.`], config: null };
  }
  if (!tenantId)  return { ok: false, errors: ['Tenant ausente.'], config: null };
  if (!usuarioId) return { ok: false, errors: ['Usuário ausente.'], config: null };

  try {
    await prisma.alertConfig.deleteMany({ where: { tenantId, module } });
  } catch (err) {
    console.error('[ALERT_CONFIG_SERVICE_ERROR] resetConfig falhou:', err);
    return { ok: false, errors: ['Falha ao restaurar padrões.'], config: null };
  }

  cacheInvalidate(tenantId, module);

  await registrarLog({
    tenantId,
    usuarioId,
    acao: 'RESET',
    entidade: 'ConfiguracaoAlertas',
    entidadeId: module,
    detalhes: `Configuração de alertas ${module} restaurada aos padrões do sistema.`,
  });

  return { ok: true, errors: [], config: await getConfig(tenantId, module) };
}

export function getModulosSuportados() {
  return listarModulosSuportados();
}

export function getDefaults(module) {
  return DEFAULTS[module] ? { ...DEFAULTS[module] } : null;
}

// Para os testes ou cenários onde queremos limpar tudo (não exposto na API)
export function _clearCache() {
  cache.clear();
}
