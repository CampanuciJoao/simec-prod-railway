// Ficheiro: src/hooks/time/useTenantTime.js
// Descrição: Hook central para timezone e locale do tenant

import { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const DEFAULT_TIMEZONE = 'America/Campo_Grande';
const DEFAULT_LOCALE = 'pt-BR';

export function useTenantTime() {
  const auth = useAuth?.() || {};

  const usuario =
    auth.usuario ||
    auth.user ||
    auth.currentUser ||
    null;

  const tenant =
    usuario?.tenant ||
    auth.tenant ||
    null;

  const timezone =
    tenant?.timezone ||
    usuario?.tenantTimezone ||
    DEFAULT_TIMEZONE;

  const locale =
    tenant?.locale ||
    usuario?.tenantLocale ||
    DEFAULT_LOCALE;

  return useMemo(
    () => ({
      timezone,
      locale,
      tenant,
      usuario,
      defaults: {
        timezone: DEFAULT_TIMEZONE,
        locale: DEFAULT_LOCALE,
      },
    }),
    [timezone, locale, tenant, usuario]
  );
}

export default useTenantTime;