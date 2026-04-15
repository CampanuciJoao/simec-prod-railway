const { publicarContagemAlertasParaTenant } = require('./alertasRealtimePublisher');

const debounceMap = new Map();
const DEBOUNCE_MS = 300;

function getTenantKey(tenantId) {
  return String(tenantId);
}

function clearTenantDebounce(tenantId) {
  const key = getTenantKey(tenantId);
  const timeout = debounceMap.get(key);

  if (timeout) {
    clearTimeout(timeout);
    debounceMap.delete(key);
  }
}

async function processarTenant(tenantId) {
  await publicarContagemAlertasParaTenant({ tenantId });

  console.log(
    `[ALERTAS_EVENT] Tenant ${tenantId} atualizado em realtime`
  );
}

async function onAlertasProcessados({ tenantsAfetados }) {
  if (!Array.isArray(tenantsAfetados) || tenantsAfetados.length === 0) {
    return;
  }

  const tenantsUnicos = [...new Set(tenantsAfetados.map(String))];

  for (const tenantId of tenantsUnicos) {
    clearTenantDebounce(tenantId);

    const timeout = setTimeout(async () => {
      try {
        await processarTenant(tenantId);
      } catch (error) {
        console.error(
          `[ALERTAS_EVENT_ERROR][tenant=${tenantId}]`,
          error
        );
      } finally {
        debounceMap.delete(getTenantKey(tenantId));
      }
    }, DEBOUNCE_MS);

    debounceMap.set(getTenantKey(tenantId), timeout);
  }
}

async function flushAlertasProcessados({ tenantsAfetados }) {
  if (!Array.isArray(tenantsAfetados) || tenantsAfetados.length === 0) {
    return;
  }

  const tenantsUnicos = [...new Set(tenantsAfetados.map(String))];

  for (const tenantId of tenantsUnicos) {
    clearTenantDebounce(tenantId);

    try {
      await processarTenant(tenantId);
    } catch (error) {
      console.error(
        `[ALERTAS_EVENT_FLUSH_ERROR][tenant=${tenantId}]`,
        error
      );
    }
  }
}

module.exports = {
  onAlertasProcessados,
  flushAlertasProcessados,
};