import { useAuth } from '@/contexts/AuthContext';

// Hierarquia: usuário → tenant → UTC
export function useTenantTimezone() {
  const { usuario, tenant } = useAuth();
  return usuario?.timezone || tenant?.timezone || 'UTC';
}

// Hierarquia: usuário → unidade → tenant → UTC
export function useUnidadeTimezone(unidade) {
  const { usuario, tenant } = useAuth();
  return usuario?.timezone || unidade?.timezone || tenant?.timezone || 'UTC';
}
