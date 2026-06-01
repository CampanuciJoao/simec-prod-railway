import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRotate,
  faCoins,
  faBoltLightning,
  faChartLine,
  faTriangleExclamation,
  faShield,
  faGaugeHigh,
} from '@fortawesome/free-solid-svg-icons';

import {
  Button,
  PageLayout,
  PageHeader,
  PageSection,
  PageState,
} from '@/components/ui';
import { useLlmCallLog } from '@/hooks/superadmin/useLlmCallLog';

const fmtUsd = (n) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(n || 0);

const fmtUsdShort = (n) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);

const fmtInt = (n) => new Intl.NumberFormat('pt-BR').format(n || 0);

const fmtPct = (n) =>
  `${((n || 0) * 100).toFixed(1)}%`;

function StatCard({ icon, label, value, hint, tone = 'slate' }) {
  const toneColor = {
    slate: 'var(--text-primary)',
    green: 'var(--color-success)',
    yellow: 'var(--color-warning)',
    red: 'var(--color-danger)',
    blue: 'var(--brand-primary)',
  }[tone];

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: 'var(--border-soft)',
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {icon ? <FontAwesomeIcon icon={icon} /> : null}
        <span>{label}</span>
      </div>
      <div className="mt-1 font-mono text-2xl tabular-nums" style={{ color: toneColor }}>
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

function TabelaSimples({ colunas, linhas, emptyMessage }) {
  if (!linhas?.length) {
    return <PageState isEmpty emptyMessage={emptyMessage} />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr style={{ color: 'var(--text-muted)' }} className="text-left text-xs uppercase">
            {colunas.map((c) => (
              <th
                key={c.key}
                className={['px-3 py-2', c.align === 'right' ? 'text-right' : ''].join(' ')}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, idx) => (
            <tr key={idx} style={{ borderTop: '1px solid var(--border-soft)' }}>
              {colunas.map((c) => {
                const style = typeof c.style === 'function' ? c.style(linha) : c.style;
                return (
                  <td
                    key={c.key}
                    className={[
                      'px-3 py-2',
                      c.align === 'right' ? 'text-right font-mono tabular-nums' : '',
                      c.mono ? 'font-mono' : '',
                    ].join(' ')}
                    style={style}
                  >
                    {c.render ? c.render(linha) : linha[c.key]}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SuperAdminLlmCallLogPage() {
  const { resumo, porTenant, porFeature, serieDiaria, loading, error, recarregar } =
    useLlmCallLog();

  return (
    <PageLayout>
      <PageHeader
        title="Custo LLM (SuperAdmin)"
        subtitle="Chamadas a OpenAI/Gemini agregadas — janela default: últimos 30 dias"
        actions={
          <Button variant="secondary" onClick={recarregar} disabled={loading}>
            <FontAwesomeIcon icon={faRotate} className={loading ? 'animate-spin' : ''} />
            <span className="ml-2">Atualizar</span>
          </Button>
        }
      />

      {error ? (
        <PageSection>
          <PageState error={error} />
        </PageSection>
      ) : null}

      {loading && !resumo ? (
        <PageSection>
          <PageState loading loadingMessage="Carregando dados..." />
        </PageSection>
      ) : null}

      {resumo ? (
        <>
          <PageSection title="Visão geral">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                icon={faCoins}
                label="Custo total"
                value={fmtUsdShort(resumo.custoTotalUsd)}
                hint={`${fmtInt(resumo.totalChamadas)} chamadas`}
                tone="green"
              />
              <StatCard
                icon={faBoltLightning}
                label="Duração média"
                value={`${fmtInt(resumo.duracaoMediaMs)} ms`}
                hint={`${fmtInt(resumo.tokensIn)} tok in • ${fmtInt(resumo.tokensOut)} tok out`}
                tone="blue"
              />
              <StatCard
                icon={faChartLine}
                label="Taxa de fallback"
                value={fmtPct(resumo.taxaFallback)}
                hint={`${fmtInt(resumo.distribuicaoStatus?.fallback || 0)} de ${fmtInt(resumo.totalChamadas)}`}
                tone={resumo.taxaFallback > 0.05 ? 'yellow' : 'slate'}
              />
              <StatCard
                icon={faTriangleExclamation}
                label="Taxa de erro"
                value={fmtPct(resumo.taxaErro)}
                hint={`${fmtInt(resumo.distribuicaoStatus?.error || 0)} erros`}
                tone={resumo.taxaErro > 0.01 ? 'red' : 'slate'}
              />
            </div>
          </PageSection>

          {resumo.pgvectorBackfill ? (
            <PageSection
              title="Backfill pgvector"
              subtitle="Status da migração de embedding JSON para coluna vector(1536) — busca por similaridade fica O(log n) quando 100%"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard
                  label="Total embeddings"
                  value={fmtInt(resumo.pgvectorBackfill.total)}
                  tone="slate"
                />
                <StatCard
                  label="Preenchidos"
                  value={fmtInt(resumo.pgvectorBackfill.preenchidos)}
                  hint={`${resumo.pgvectorBackfill.progressoPct}%`}
                  tone={resumo.pgvectorBackfill.progressoPct === 100 ? 'green' : 'yellow'}
                />
                <StatCard
                  label="Pendentes"
                  value={fmtInt(resumo.pgvectorBackfill.pendentes)}
                  hint={
                    resumo.pgvectorBackfill.pendentes > 0
                      ? 'Rodar: node scripts/backfill-pgvector.mjs'
                      : 'Migração completa'
                  }
                  tone={resumo.pgvectorBackfill.pendentes === 0 ? 'green' : 'yellow'}
                />
              </div>
            </PageSection>
          ) : null}

          <PageSection
            title="Proteção em tempo real"
            subtitle="Rate limiter (token bucket) e circuit breaker do processo atual — útil para debug em produção"
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div
                className="rounded-xl border p-4"
                style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface)' }}
              >
                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  <FontAwesomeIcon icon={faGaugeHigh} />
                  <span>Rate limiter</span>
                </div>
                <TabelaSimples
                  colunas={[
                    { key: 'provider', label: 'Provider', mono: true, render: (r) => r.provider },
                    {
                      key: 'inFlight',
                      label: 'Em voo / max',
                      align: 'right',
                      render: (r) => `${r.inFlight} / ${r.maxConcurrent}`,
                    },
                    {
                      key: 'windowCount',
                      label: 'No minuto / rpm',
                      align: 'right',
                      render: (r) => `${r.windowCount} / ${r.rpm}`,
                    },
                    {
                      key: 'queueLength',
                      label: 'Fila',
                      align: 'right',
                      render: (r) => fmtInt(r.queueLength),
                      style: (r) =>
                        r.queueLength > 0 ? { color: 'var(--color-warning)' } : null,
                    },
                  ]}
                  linhas={Object.entries(resumo.rateLimit || {}).map(([provider, s]) => ({
                    provider,
                    ...s,
                  }))}
                  emptyMessage="Sem dados de rate limit ainda."
                />
              </div>

              <div
                className="rounded-xl border p-4"
                style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface)' }}
              >
                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  <FontAwesomeIcon icon={faShield} />
                  <span>Circuit breaker</span>
                </div>
                <TabelaSimples
                  colunas={[
                    { key: 'provider', label: 'Provider', mono: true, render: (r) => r.provider },
                    {
                      key: 'estado',
                      label: 'Estado',
                      mono: true,
                      render: (r) => r.estado,
                      style: (r) => ({
                        color:
                          r.estado === 'closed'
                            ? 'var(--color-success)'
                            : r.estado === 'open'
                            ? 'var(--color-danger)'
                            : 'var(--color-warning)',
                        fontWeight: 600,
                      }),
                    },
                    {
                      key: 'taxaErro',
                      label: 'Taxa de erro',
                      align: 'right',
                      render: (r) => fmtPct(r.taxaErro),
                    },
                    {
                      key: 'eventos',
                      label: 'Eventos (60s)',
                      align: 'right',
                      render: (r) => fmtInt(r.eventos),
                    },
                  ]}
                  linhas={Object.entries(resumo.circuitBreaker || {}).map(([provider, s]) => ({
                    provider,
                    ...s,
                  }))}
                  emptyMessage="Sem eventos no circuit breaker ainda."
                />
              </div>
            </div>
          </PageSection>

          <PageSection title="Custo por provider">
            <TabelaSimples
              colunas={[
                { key: 'provider', label: 'Provider', mono: true },
                { key: 'chamadas', label: 'Chamadas', align: 'right' },
                {
                  key: 'custoUsd',
                  label: 'Custo USD',
                  align: 'right',
                  render: (r) => fmtUsd(r.custoUsd),
                },
              ]}
              linhas={resumo.porProvider || []}
              emptyMessage="Nenhuma chamada no período."
            />
          </PageSection>

          <PageSection
            title="Custo por tenant"
            subtitle="Atribuição direta de bill — base para cobrança variável quando virar feature paga"
          >
            <TabelaSimples
              colunas={[
                { key: 'tenantNome', label: 'Tenant' },
                {
                  key: 'tenantSlug',
                  label: 'Slug',
                  mono: true,
                  render: (r) => r.tenantSlug || '—',
                },
                { key: 'chamadas', label: 'Chamadas', align: 'right' },
                {
                  key: 'tokens',
                  label: 'Tokens (in/out)',
                  align: 'right',
                  render: (r) => `${fmtInt(r.tokensIn)} / ${fmtInt(r.tokensOut)}`,
                },
                {
                  key: 'custoUsd',
                  label: 'Custo USD',
                  align: 'right',
                  render: (r) => fmtUsd(r.custoUsd),
                },
              ]}
              linhas={porTenant}
              emptyMessage="Nenhum tenant com chamadas no período."
            />
          </PageSection>

          <PageSection
            title="Custo por feature"
            subtitle="Quanto cada parte do sistema (GEHC, agente, RAG, etc) consome em LLM"
          >
            <TabelaSimples
              colunas={[
                { key: 'feature', label: 'Feature', mono: true },
                { key: 'chamadas', label: 'Chamadas', align: 'right' },
                {
                  key: 'duracaoMediaMs',
                  label: 'Latência média',
                  align: 'right',
                  render: (r) => `${fmtInt(r.duracaoMediaMs)} ms`,
                },
                {
                  key: 'custoUsd',
                  label: 'Custo USD',
                  align: 'right',
                  render: (r) => fmtUsd(r.custoUsd),
                },
              ]}
              linhas={porFeature}
              emptyMessage="Nenhuma feature com chamadas no período."
            />
          </PageSection>

          <PageSection title="Série diária">
            <TabelaSimples
              colunas={[
                {
                  key: 'dia',
                  label: 'Dia',
                  render: (r) =>
                    new Intl.DateTimeFormat('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                    }).format(new Date(r.dia)),
                  mono: true,
                },
                { key: 'chamadas', label: 'Chamadas', align: 'right' },
                {
                  key: 'tokens',
                  label: 'Tokens (in/out)',
                  align: 'right',
                  render: (r) => `${fmtInt(r.tokensIn)} / ${fmtInt(r.tokensOut)}`,
                },
                {
                  key: 'custoUsd',
                  label: 'Custo USD',
                  align: 'right',
                  render: (r) => fmtUsd(r.custoUsd),
                },
              ]}
              linhas={serieDiaria}
              emptyMessage="Sem chamadas no período."
            />
          </PageSection>
        </>
      ) : null}
    </PageLayout>
  );
}
