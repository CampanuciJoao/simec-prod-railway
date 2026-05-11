/**
 * Validador de configuração de alertas por módulo.
 *
 * Cada módulo declara seu schema com tipos, ranges e regras cruzadas.
 * Para adicionar um novo módulo, basta criar uma entrada em MODULE_SCHEMAS
 * com a mesma forma da existente em GEHC.
 */

const GEHC_FIELDS = {
  heliumWarn:          { type: 'number', min: 0,    max: 100,  label: 'Nível de hélio — aviso (%)' },
  heliumCritical:      { type: 'number', min: 0,    max: 100,  label: 'Nível de hélio — crítico (%)' },
  tempWarn:            { type: 'number', min: -50,  max: 100,  label: 'Temperatura do resfriador — aviso (°C)' },
  tempCritical:        { type: 'number', min: -50,  max: 100,  label: 'Temperatura do resfriador — crítica (°C)' },
  flowMin:             { type: 'number', min: 0,    max: 100,  label: 'Fluxo mínimo do resfriador (GPM)' },
  pressureMin:         { type: 'number', min: 0,    max: 100,  label: 'Pressão do hélio — mínima (PSI)' },
  pressureMax:         { type: 'number', min: 0,    max: 100,  label: 'Pressão do hélio — máxima aviso (PSI)' },
  pressureCriticalMax: { type: 'number', min: 0,    max: 100,  label: 'Pressão do hélio — máxima crítica (PSI)' },
};

const GEHC_CROSS_RULES = [
  {
    test:    (c) => c.heliumWarn > c.heliumCritical,
    message: 'Hélio: limite de aviso deve ser maior que o crítico (avisamos antes do crítico).',
  },
  {
    test:    (c) => c.tempCritical > c.tempWarn,
    message: 'Temperatura: limite crítico deve ser maior que o de aviso.',
  },
  {
    test:    (c) => c.pressureMin < c.pressureMax,
    message: 'Pressão: mínimo deve ser menor que o máximo de aviso.',
  },
  {
    test:    (c) => c.pressureMax <= c.pressureCriticalMax,
    message: 'Pressão: máximo de aviso deve ser menor ou igual ao máximo crítico.',
  },
];

const MODULE_SCHEMAS = {
  GEHC: { fields: GEHC_FIELDS, crossRules: GEHC_CROSS_RULES },
};

export function listarModulosSuportados() {
  return Object.keys(MODULE_SCHEMAS);
}

export function getModuleSchema(module) {
  return MODULE_SCHEMAS[module] || null;
}

/**
 * Valida um payload parcial de configuração.
 * - Aceita só chaves conhecidas.
 * - Aplica tipo, min/max por campo.
 * - Aplica regras cruzadas (warn > critical, etc.) usando o merge com `currentConfig`.
 *
 * Retorna { ok, errors, sanitized } onde:
 *   - errors: array de strings legíveis em pt-BR
 *   - sanitized: payload validado com tipos numéricos coercidos
 */
export function validarAlertConfigPayload(module, partial, currentConfig = {}) {
  const schema = MODULE_SCHEMAS[module];
  if (!schema) {
    return { ok: false, errors: [`Módulo desconhecido: ${module}.`], sanitized: null };
  }

  const errors = [];
  const sanitized = {};
  const knownKeys = Object.keys(schema.fields);

  if (!partial || typeof partial !== 'object') {
    return { ok: false, errors: ['Payload inválido: esperava objeto JSON.'], sanitized: null };
  }

  // Tipo + range por campo
  for (const [key, raw] of Object.entries(partial)) {
    if (!knownKeys.includes(key)) {
      errors.push(`Campo desconhecido para ${module}: "${key}".`);
      continue;
    }
    const spec = schema.fields[key];
    const num = Number(raw);
    if (Number.isNaN(num) || !Number.isFinite(num)) {
      errors.push(`${spec.label}: valor inválido (não é número).`);
      continue;
    }
    if (num < spec.min || num > spec.max) {
      errors.push(`${spec.label}: deve estar entre ${spec.min} e ${spec.max}.`);
      continue;
    }
    sanitized[key] = num;
  }

  if (errors.length > 0) {
    return { ok: false, errors, sanitized: null };
  }

  // Regras cruzadas sobre o resultado final (merge defaults + override)
  const merged = { ...currentConfig, ...sanitized };
  for (const rule of schema.crossRules) {
    try {
      if (!rule.test(merged)) errors.push(rule.message);
    } catch {
      // se algum campo necessário ainda não está presente em merged, ignora a regra
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors, sanitized: null };
  }

  return { ok: true, errors: [], sanitized };
}
