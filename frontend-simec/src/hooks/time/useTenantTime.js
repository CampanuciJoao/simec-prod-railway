import { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const DEFAULT_LOCALE = 'pt-BR';

export function useTenantTime() {
  const auth = useAuth?.() || {};

  const usuario = auth.usuario || auth.user || auth.currentUser || null;
  const tenant = usuario?.tenant || auth.tenant || null;

  // Hierarquia: usuário → tenant → UTC
  const timezone =
    usuario?.timezone ||
    tenant?.timezone ||
    usuario?.tenantTimezone ||
    'UTC';

  const locale = tenant?.locale || usuario?.tenantLocale || DEFAULT_LOCALE;

  return useMemo(
    () => ({ timezone, locale, tenant, usuario }),
    [timezone, locale, tenant, usuario]
  );
}

export default useTenantTime;