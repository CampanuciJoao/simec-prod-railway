import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRotate,
  faBrain,
  faLightbulb,
  faBuildingShield,
  faCirclePause,
  faCirclePlay,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';

import {
  Button,
  PageSection,
  PageState,
  Badge,
} from '@/components/ui';
import { useAprendizadoGlobal } from '@/hooks/superadmin/useAprendizadoGlobal';
import { formatarDataHora } from '@/utils/timeUtils';

function corCobertura(pct) {
  if (pct === null || pct === undefined) return 'var(--text-muted)';
  if (pct >= 80) return 'var(--color-success)';
  if (pct >= 40) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

function StatCard({ label, value, hint, hintColor }) {
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
        <div className="mt-1 text-xs" style={{ color: hintColor || 'var(--text-muted)' }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function VisaoGlobalSection({ visao }) {
  if (!visao) return null;
  const { tenants, knowledge, insights, gehc } = visao;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Clientes ativos"
          value={(tenants.ativos ?? 0).toLocaleString('pt-BR')}
          hint="tenants CUSTOMER ativos"
        />
        <StatCard
          label="Eventos no Knowledge Layer"
          value={(knowledge.totalEventos ?? 0).toLocaleString('pt-BR')}
          hint={
            knowledge.coberturaEmbeddings !== null
              ? `${knowledge.coberturaEmbeddings}% com embedding`
              : '—'
          }
          hintColor={corCobertura(knowledge.coberturaEmbeddings)}
        />
        <StatCard
          label="Insights ativos"
          value={(insights.ativos ?? 0).toLocaleString('pt-BR')}
          hint={
            insights.taxaFalsoPositivo !== null
              ? `${insights.taxaFalsoPositivo}% descartados no histórico`
              : 'sem feedback ainda'
          }
          hintColor={
            insights.taxaFalsoPositivo !== null && insights.taxaFalsoPositivo > 50
              ? 'var(--color-warning)'
              : 'var(--text-muted)'
          }
        />
        <StatCard
          label="PDFs GEHC analisados"
          value={(gehc.pdfsExtraidos ?? 0).toLocaleString('pt-BR')}
          hint={
            gehc.coberturaPdfPct !== null
              ? `${gehc.coberturaPdfPct}% das ${(gehc.totalOs || 0).toLocaleString('pt-BR')} OSs com PDF`
              : 'sem OSs GEHC ainda'
          }
          hintColor={corCobertura(gehc.coberturaPdfPct)}
        />
      </div>
    </div>
  );
}

function PipelinesGlobaisSection({ pipelines }) {
  if (!pipelines?.length) {
    return <PageState isEmpty emptyMessage="Nenhum pipeline global configurado." />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr style={{ color: 'var(--text-muted)' }} className="text-left text-xs uppercase">
            <th className="px-3 py-2">Pipeline</th>
            <th className="px-3 py-2">Estado</th>
            <th className="px-3 py-2">Última execução</th>
            <th className="px-3 py-2">Motivo da pausa</th>
          </tr>
        </thead>
        <tbody>
          {pipelines.map((p) => (
            <tr key={p.pipeline} style={{ borderTop: '1px solid var(--border-soft)' }}>
              <td className="px-3 py-2">
                <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {p.label}
                </div>
                <div className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                  {p.pipeline}
                </div>
              </td>
              <td className="px-3 py-2">
                {p.ativo ? (
                  <Badge variant="green">
                    <FontAwesomeIcon icon={faCirclePlay} /> Ativo
                  </Badge>
                ) : (
                  <Badge variant="orange">
                    <FontAwesomeIcon icon={faCirclePause} /> Pausado
                  </Badge>
                )}
              </td>
              <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                {p.ultimaExecucaoEm ? (
                  <>
                    {formatarDataHora(p.ultimaExecucaoEm)}{' '}
                    {p.ultimaExecucaoOk === false && (
                      <FontAwesomeIcon
                        icon={faTriangleExclamation}
                        style={{ color: 'var(--color-danger)' }}
                        title={p.ultimaExecucaoMensagem || 'Última execução falhou'}
                      />
                    )}
                  </>
                ) : (
                  '—'
                )}
              </td>
              <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                {!p.ativo
                  ? (p.motivoPausa || `Pausado por ${p.pausadoPor?.nome || 'admin'}`)
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PorTenantSection({ tenants }) {
  if (!tenants?.length) {
    return <PageState isEmpty emptyMessage="Nenhum tenant CUSTOMER ativo na base." />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr style={{ color: 'var(--text-muted)' }} className="text-left text-xs uppercase">
            <th className="px-3 py-2">Cliente</th>
            <th className="px-3 py-2 text-right">OSs GEHC</th>
            <th className="px-3 py-2 text-right">PDFs baixados</th>
            <th className="px-3 py-2 text-right">PDFs analisados</th>
            <th className="px-3 py-2 text-right">Cobertura</th>
            <th className="px-3 py-2 text-right">Eventos</th>
            <th className="px-3 py-2 text-right">Insights ativos</th>
            <th className="px-3 py-2">Knowledge Layer</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((t) => (
            <tr key={t.tenantId} style={{ borderTop: '1px solid var(--border-soft)' }}>
              <td className="px-3 py-2">
                <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {t.nome}
                </div>
                <div className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                  {t.slug}
                </div>
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">
                {(t.gehc.totalOs || 0).toLocaleString('pt-BR')}
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">
                {(t.gehc.pdfsBaixados || 0).toLocaleString('pt-BR')}
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">
                {(t.gehc.pdfsExtraidos || 0).toLocaleString('pt-BR')}
              </td>
              <td
                className="px-3 py-2 text-right font-mono tabular-nums font-semibold"
                style={{ color: corCobertura(t.gehc.coberturaPdfPct) }}
              >
                {t.gehc.coberturaPdfPct === null ? '—' : `${t.gehc.coberturaPdfPct}%`}
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">
                {(t.totalEventos || 0).toLocaleString('pt-BR')}
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">
                {(t.insightsAtivos || 0).toLocaleString('pt-BR')}
              </td>
              <td className="px-3 py-2 text-xs">
                {t.knowledgeLayer.pausado ? (
                  <Badge variant="orange">Pausado</Badge>
                ) : t.knowledgeLayer.ultimaExecucaoEm ? (
                  <span style={{ color: 'var(--text-muted)' }}>
                    último: {formatarDataHora(t.knowledgeLayer.ultimaExecucaoEm)}
                    {t.knowledgeLayer.ultimaExecucaoOk === false && (
                      <>
                        {' '}
                        <FontAwesomeIcon
                          icon={faTriangleExclamation}
                          style={{ color: 'var(--color-danger)' }}
                        />
                      </>
                    )}
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>nunca rodou</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SuperAdminAprendizadoPage() {
  const {
    visao,
    porTenant,
    pipelinesGlobais,
    loading,
    error,
    atualizadoEm,
    recarregar,
  } = useAprendizadoGlobal();

  if (loading && !visao) {
    return <PageSection><PageState loading /></PageSection>;
  }
  if (error && !visao) {
    return <PageSection><PageState error={error} /></PageSection>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {atualizadoEm
            ? `Atualizado às ${atualizadoEm.toLocaleTimeString('pt-BR')}`
            : 'Aguardando primeiro carregamento…'}
        </div>
        <Button variant="secondary" size="sm" onClick={recarregar}>
          <FontAwesomeIcon icon={faRotate} />
          <span className="ml-2">Atualizar agora</span>
        </Button>
      </div>

      <PageSection
        title="Visão global"
        icon={<FontAwesomeIcon icon={faBrain} />}
        description="Métricas agregadas do aprendizado de máquina em toda a base de clientes."
      >
        <VisaoGlobalSection visao={visao} />
      </PageSection>

      <PageSection
        title="Pipelines globais (kill switches)"
        icon={<FontAwesomeIcon icon={faLightbulb} />}
        description="Estado dos pipelines sistêmicos. Pausa global afeta todos os clientes ao mesmo tempo."
      >
        <PipelinesGlobaisSection pipelines={pipelinesGlobais} />
      </PageSection>

      <PageSection
        title="Por cliente"
        icon={<FontAwesomeIcon icon={faBuildingShield} />}
        description="Cobertura GEHC e atividade do Knowledge Layer por tenant. Ordenado pela menor cobertura — esses são os que a IA tem menos contexto para aprender."
      >
        <PorTenantSection tenants={porTenant} />
      </PageSection>
    </div>
  );
}

export default SuperAdminAprendizadoPage;
