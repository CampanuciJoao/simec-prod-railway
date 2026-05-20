import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRotate,
  faServer,
  faListCheck,
  faBrain,
  faStethoscope,
} from '@fortawesome/free-solid-svg-icons';

import {
  Button,
  PageSection,
  PageState,
  Badge,
} from '@/components/ui';
import { useSaude } from '@/hooks/superadmin/useSaude';

function StatCard({ label, value, hint }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: 'var(--border-soft)',
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div className="mt-1 font-mono text-2xl tabular-nums" style={{ color: 'var(--text-primary)' }}>
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function FilasSection({ filas }) {
  const entries = Object.entries(filas || {});
  if (entries.length === 0) {
    return <PageState isEmpty emptyMessage="Sem dados de fila ainda. Aguarde o primeiro polling." />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr style={{ color: 'var(--text-muted)' }} className="text-left text-xs uppercase">
            <th className="px-3 py-2">Fila</th>
            <th className="px-3 py-2 text-right">Waiting</th>
            <th className="px-3 py-2 text-right">Active</th>
            <th className="px-3 py-2 text-right">Delayed</th>
            <th className="px-3 py-2 text-right">Failed</th>
            <th className="px-3 py-2 text-right">Completed</th>
            <th className="px-3 py-2 text-right">Paused</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([nome, counts]) => (
            <tr key={nome} style={{ borderTop: '1px solid var(--border-soft)' }}>
              <td className="px-3 py-2 font-mono">{nome}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{counts.waiting ?? 0}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{counts.active ?? 0}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{counts.delayed ?? 0}</td>
              <td
                className="px-3 py-2 text-right font-mono tabular-nums"
                style={{
                  color: (counts.failed ?? 0) > 0 ? 'var(--color-danger)' : 'var(--text-primary)',
                }}
              >
                {counts.failed ?? 0}
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{counts.completed ?? 0}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{counts.paused ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GehcSection({ gehc }) {
  const tenants = Object.entries(gehc?.authPorTenant || {});
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard
          label="Downloads totais"
          value={(gehc?.downloadsTotal ?? 0).toLocaleString('pt-BR')}
          hint="PDFs baixados desde o último restart"
        />
        <StatCard
          label="Tenants com auth válida"
          value={tenants.filter(([, v]) => v === 1).length}
          hint={`de ${tenants.length} monitorados`}
        />
      </div>

      {tenants.length === 0 ? (
        <PageState isEmpty emptyMessage="Nenhum tenant com auth GEHC observada ainda." />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--text-muted)' }} className="text-left text-xs uppercase">
                <th className="px-3 py-2">Tenant</th>
                <th className="px-3 py-2">Status auth</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(([tenant, status]) => (
                <tr key={tenant} style={{ borderTop: '1px solid var(--border-soft)' }}>
                  <td className="px-3 py-2 font-mono text-xs">{tenant}</td>
                  <td className="px-3 py-2">
                    {status === 1 ? (
                      <Badge variant="green">OK</Badge>
                    ) : status === 0 ? (
                      <Badge variant="red">Falha</Badge>
                    ) : (
                      <Badge variant="slate">Desconhecido</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LlmSection({ llm }) {
  const callsByStatus = llm?.callsByStatus || {};
  const tokensByProvider = llm?.tokensByProvider || {};
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Chamadas LLM"
          value={(llm?.totalCalls ?? 0).toLocaleString('pt-BR')}
          hint="desde o último restart"
        />
        <StatCard
          label="Tokens totais"
          value={(llm?.totalTokens ?? 0).toLocaleString('pt-BR')}
          hint="prompt + completion"
        />
        <StatCard
          label="Taxa de fallback"
          value={
            llm?.totalCalls
              ? `${(((callsByStatus.fallback || 0) / llm.totalCalls) * 100).toFixed(1)}%`
              : '—'
          }
          hint="OpenAI → Gemini"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div
          className="rounded-xl border p-4"
          style={{
            borderColor: 'var(--border-soft)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Chamadas por status
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {Object.entries(callsByStatus).map(([status, count]) => (
              <li key={status} className="flex justify-between font-mono tabular-nums">
                <span style={{ color: 'var(--text-secondary)' }}>{status}</span>
                <span>{count.toLocaleString('pt-BR')}</span>
              </li>
            ))}
            {Object.keys(callsByStatus).length === 0 ? (
              <li className="text-xs" style={{ color: 'var(--text-muted)' }}>—</li>
            ) : null}
          </ul>
        </div>

        <div
          className="rounded-xl border p-4"
          style={{
            borderColor: 'var(--border-soft)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <div className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Tokens por provider
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {Object.entries(tokensByProvider).map(([provider, count]) => (
              <li key={provider} className="flex justify-between font-mono tabular-nums">
                <span style={{ color: 'var(--text-secondary)' }}>{provider}</span>
                <span>{count.toLocaleString('pt-BR')}</span>
              </li>
            ))}
            {Object.keys(tokensByProvider).length === 0 ? (
              <li className="text-xs" style={{ color: 'var(--text-muted)' }}>—</li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SuperAdminSaudePage() {
  const { snapshot, loading, error, atualizadoEm, recarregar } = useSaude();

  if (loading && !snapshot) {
    return <PageSection><PageState loading /></PageSection>;
  }

  if (error && !snapshot) {
    return <PageSection><PageState error={error} /></PageSection>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {atualizadoEm
            ? `Atualizado às ${atualizadoEm.toLocaleTimeString('pt-BR')} · auto-refresh a cada 15s`
            : 'Aguardando primeiro snapshot…'}
        </div>
        <Button variant="secondary" size="sm" onClick={recarregar}>
          <FontAwesomeIcon icon={faRotate} />
          <span className="ml-2">Atualizar agora</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Requests HTTP"
          value={(snapshot?.http?.totalRequests ?? 0).toLocaleString('pt-BR')}
          hint="desde o último restart"
        />
        <StatCard
          label="Chamadas LLM"
          value={(snapshot?.llm?.totalCalls ?? 0).toLocaleString('pt-BR')}
        />
        <StatCard
          label="PDFs GEHC baixados"
          value={(snapshot?.gehc?.downloadsTotal ?? 0).toLocaleString('pt-BR')}
        />
      </div>

      <PageSection
        title="Filas BullMQ"
        icon={<FontAwesomeIcon icon={faListCheck} />}
      >
        <FilasSection filas={snapshot?.filas} />
      </PageSection>

      <PageSection
        title="GEHC — autenticação por tenant"
        icon={<FontAwesomeIcon icon={faStethoscope} />}
      >
        <GehcSection gehc={snapshot?.gehc} />
      </PageSection>

      <PageSection
        title="LLM — chamadas e tokens"
        icon={<FontAwesomeIcon icon={faBrain} />}
      >
        <LlmSection llm={snapshot?.llm} />
      </PageSection>

      <PageSection
        title="Endpoint /metrics"
        icon={<FontAwesomeIcon icon={faServer} />}
      >
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Métricas em formato Prometheus disponíveis em <code className="rounded bg-black/10 px-1 font-mono text-xs">GET /metrics</code> (sem auth — proteger via proxy/firewall em produção).
        </p>
      </PageSection>
    </div>
  );
}

export default SuperAdminSaudePage;
