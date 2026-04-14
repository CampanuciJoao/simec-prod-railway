// Ficheiro: backend-simec/services/time/timezoneResolver.js

import { SYSTEM_DEFAULT_TIMEZONE } from './constants.js';
import { isValidTimezone } from './validators.js';

export function getTenantTimezone(tenant) {
  const timezone = tenant?.timezone;

  if (isValidTimezone(timezone)) {
    return timezone;
  }

  return SYSTEM_DEFAULT_TIMEZONE;
}

export function getUnidadeTimezone(unidade) {
  const timezone = unidade?.timezone;

  if (isValidTimezone(timezone)) {
    return timezone;
  }

  return null;
}

export function resolveOperationalTimezone({ tenantTimezone, unidadeTimezone }) {
  if (isValidTimezone(unidadeTimezone)) {
    return unidadeTimezone;
  }

  if (isValidTimezone(tenantTimezone)) {
    return tenantTimezone;
  }

  return SYSTEM_DEFAULT_TIMEZONE;
}