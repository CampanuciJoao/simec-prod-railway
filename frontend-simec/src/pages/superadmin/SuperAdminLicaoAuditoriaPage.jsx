import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRotate,
  faShieldHalved,
  faCircleCheck,
  faCircleXmark,
  faTriangleExclamation,
  faPlay,
} from '@fortawesome/free-solid-svg-icons';

import {
  Button,
  PageLayout,
  PageHeader,
  PageSection,
  PageState,
} from '@/components/ui';
import { useLicaoAuditoria } from '@/hooks/superadmin/useLicaoAuditoria';

const fmtInt = (n) => new Intl.NumberFormat('pt-BR').format(n || 0);

const fmtDateTime = (iso) =>
  iso
    ? new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso))
    : '—';

const PADROES_LABELS = {
  numero_curto_isolado: 'Número curto isolado',
  sigla_maiuscula: 'Sigla em maiúsculas',
  palavra_capitalizada_sem_titulo: 'Palavra capitalizada (potencial nome)',
  titulo_com_nome: 'Título + nome (scrub falhou)',
  telefone_parcial: 'Telefone parcial',
};

function StatCard({ icon, label, value, hint, tone = 'slate' }) {
  const color = {
    slate: 'var(--text-primary)',
    green: 'var(--color-success)',
    yellow: 'var(--color-warning)',
    red: 'var(--color-danger)',
  }[tone];
  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface)' }}
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {icon ? <FontAwesomeIcon icon={icon} /> : null}
        <span>{label}</span>
      </div>
      <div className="mt-1 font-mono text-2xl tabular-nums" style={{ color }}>
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</div>
      ) : null}
    </div>
  );
}

function LicaoCard({ licao, onDecidir }) {
  const [acaoLoading, setAcaoLoading] = useState(null);
  const auditoria = licao.ultimaAuditoria;
  const padroes = Array.isArray(auditoria?.padroes) ? auditoria.padroes : [];

  const decidir = async (decisao) => {
    setAcaoLoading(decisao);
    try {
      await onDecidir(licao.id, decisao);
    } finally {
      setAcaoLoading(null);
    }
  };

  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface)' }}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className="rounded px-2 py-0.5 text-xs font-mono"
          style={{ backgroundColor: 'var(--color-warning-soft)', color: 'var(--color-warning)' }}
        >
          QUARENTENA
        </span>
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
          {licao.categoriaCorreta}
        </span>
        {licao.serviceTypeCode ? (
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            · {licao.serviceTypeCode}
          </span>
        ) : null}
        <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
          {fmtDateTime(licao.criadaEm)}
        </span>
      </div>

      <p
        className="mb-2 text-sm leading-relaxed"
        style={{ color: 'var(--text-primary)' }}
      >
        {licao.textoDespersonalizado}
      </p>

      {padroes.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-1">
          {padroes.map((p) => (
            <span
              key={p}
              className="rounded px-2 py-0.5 text-xs"
              style={{ backgroundColor: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}
            >
              {PADROES_LABELS[p] || p}
            </span>
          ))}
        </div>
      ) : null}

      {auditoria?.trecho ? (
        <div
          className="mb-3 rounded border px-3 py-2 text-xs"
          style={{
            borderColor: 'var(--border-soft)',
            backgroundColor: 'var(--bg-surface-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          <span className="font-semibold">Trecho suspeito: </span>
          {auditoria.trecho}
        </div>
      ) : null}

      <div className="flex gap-2">
        <Button
          variant="primary"
          onClick={() => decidir('APROVADA')}
          disabled={!!acaoLoading}
        >
          <FontAwesomeIcon icon={faCircleCheck} />
          <span className="ml-2">
            {acaoLoading === 'APROVADA' ? 'Aprovando...' : 'Aprovar (libera para few-shot)'}
          </span>
        </Button>
        <Button
          variant="danger"
          onClick={() => decidir('REJEITADA')}
          disabled={!!acaoLoading}
        >
          <FontAwesomeIcon icon={faCircleXmark} />
          <span className="ml-2">
            {acaoLoading === 'REJEITADA' ? 'Rejeitando...' : 'Rejeitar (manter desativada)'}
          </span>
        </Button>
      </div>
    </div>
  );
}

export default function SuperAdminLicaoAuditoriaPage() {
  const { resumo, quarentena, loading, executando, error, recarregar, decidir, rodarAgora } =
    useLicaoAuditoria();

  const dist = resumo?.distribuicaoStatus || {};

  return (
    <PageLayout>
      <PageHeader
        title="Auditoria de lições IA (cross-tenant)"
        subtitle="Detector adversarial flagra lições com padrões suspeitos antes de alimentarem few-shot"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={recarregar} disabled={loading}>
              <FontAwesomeIcon icon={faRotate} className={loading ? 'animate-spin' : ''} />
              <span className="ml-2">Atualizar</span>
            </Button>
            <Button variant="primary" onClick={rodarAgora} disabled={executando}>
              <FontAwesomeIcon icon={faPlay} />
              <span className="ml-2">{executando ? 'Executando...' : 'Rodar auditoria agora'}</span>
            </Button>
          </div>
        }
      />

      {error ? (
        <PageSection>
          <PageState error={error} />
        </PageSection>
      ) : null}

      {resumo ? (
        <PageSection title="Visão geral">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={faCircleCheck}
              label="Lições ativas"
              value={fmtInt(resumo.licoesAtivas)}
              hint="Alimentando few-shot"
              tone="green"
            />
            <StatCard
              icon={faTriangleExclamation}
              label="Em quarentena"
              value={fmtInt(dist.QUARENTENA)}
              hint="Aguardando revisão"
              tone={dist.QUARENTENA > 0 ? 'yellow' : 'slate'}
            />
            <StatCard
              icon={faCircleXmark}
              label="Rejeitadas"
              value={fmtInt(dist.REJEITADA)}
              hint="Mantidas desativadas"
              tone="slate"
            />
            <StatCard
              icon={faShieldHalved}
              label="Última auditoria"
              value={resumo.ultimaAuditoriaJob ? fmtDateTime(resumo.ultimaAuditoriaJob) : '—'}
              hint="Job semanal automático"
              tone="slate"
            />
          </div>
        </PageSection>
      ) : null}

      {resumo?.padroesMaisComuns30d?.length > 0 ? (
        <PageSection
          title="Padrões mais detectados (30 dias)"
          subtitle="Feedback para evoluir o detector — padrão recorrente sugere ajuste no scrubbing"
        >
          <div className="space-y-2">
            {resumo.padroesMaisComuns30d.map((p) => (
              <div
                key={p.padrao}
                className="flex items-center justify-between rounded border px-3 py-2"
                style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface)' }}
              >
                <span className="text-sm">{PADROES_LABELS[p.padrao] || p.padrao}</span>
                <span className="font-mono text-sm tabular-nums" style={{ color: 'var(--text-muted)' }}>
                  {fmtInt(p.quantidade)}
                </span>
              </div>
            ))}
          </div>
        </PageSection>
      ) : null}

      <PageSection
        title={`Lições em quarentena (${quarentena.total})`}
        subtitle="Revisão manual — aprovar libera para few-shot; rejeitar mantém desativada"
      >
        {quarentena.items.length === 0 ? (
          <PageState isEmpty emptyMessage="Nenhuma lição em quarentena. Detector não encontrou padrões suspeitos pendentes." />
        ) : (
          <div className="space-y-3">
            {quarentena.items.map((licao) => (
              <LicaoCard key={licao.id} licao={licao} onDecidir={decidir} />
            ))}
          </div>
        )}
      </PageSection>
    </PageLayout>
  );
}
