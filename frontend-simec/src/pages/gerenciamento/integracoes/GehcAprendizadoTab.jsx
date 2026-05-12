import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBrain,
  faCircleCheck,
  faCirclePause,
  faCirclePlay,
  faCircleExclamation,
  faFilePdf,
  faSpinner,
  faTriangleExclamation,
  faClockRotateLeft,
  faChartPie,
  faMagnifyingGlassChart,
} from '@fortawesome/free-solid-svg-icons';

import {
  Button,
  InfoCard,
  InlineEmptyState,
  LoadingState,
  PageSection,
  ResponsiveGrid,
} from '@/components/ui';
import { formatarDataHora } from '@/utils/timeUtils';
import { useGehcAprendizado } from '@/hooks/gerenciamento/useGehcAprendizado';
import { urlPdfDocumento } from '@/services/api/gehcAprendizadoApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativo(data) {
  if (!data) return '—';
  const d = new Date(data);
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 60_000) return 'agora há pouco';
  if (diffMs < 3600_000) return `${Math.round(diffMs / 60_000)} min atrás`;
  if (diffMs < 86_400_000) return `${Math.round(diffMs / 3600_000)} h atrás`;
  return `${Math.round(diffMs / 86_400_000)} d atrás`;
}

// Mapa categoria normalizada -> label PT-BR amigavel.
const LABELS_CAUSAS = {
  infra_chiller_cliente: 'Chiller predial do cliente',
  cryo_compressor:       'Compressor do criostato',
  magneto_helio:         'Hélio / criogenia',
  bobina:                'Bobinas',
  gradiente:             'Sistema de gradiente',
  rf:                    'Cadeia RF',
  mesa_mecanica:         'Mesa do paciente',
  software:              'Software / host',
  rede_dados:            'Rede / dados',
  infra_eletrica:        'Infraestrutura elétrica',
  desconhecido:          'Não categorizado',
};

function labelCausa(cat) {
  return LABELS_CAUSAS[cat] || cat || '—';
}

// ─── Modal de motivo (pausa) ─────────────────────────────────────────────────

function DialogoPausa({ pipeline, label, onConfirmar, onCancelar, executando }) {
  const [motivo, setMotivo] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-md rounded-2xl border p-5 space-y-3"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-soft)',
          color: 'var(--text-primary)',
        }}
      >
        <h3 className="text-base font-semibold">Pausar {label}?</h3>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {pipeline === 'global'
            ? 'Isso vai parar TODOS os pipelines automáticos da IA. Dados já capturados ficam intactos. Você pode retomar a qualquer momento.'
            : 'Isso vai pausar somente este pipeline. Outros continuam rodando normalmente.'}
        </p>
        <div className="space-y-1">
          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Motivo (opcional, fica no log)
          </label>
          <input
            type="text"
            value={motivo}
            disabled={executando}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="ex: investigando extração errada"
            className="w-full rounded-xl border px-3 py-2 text-sm"
            style={{
              borderColor: 'var(--border-soft)',
              backgroundColor: 'var(--bg-surface-soft)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onCancelar} disabled={executando}>
            Cancelar
          </Button>
          <Button type="button" variant="danger" onClick={() => onConfirmar(motivo)} disabled={executando}>
            <FontAwesomeIcon icon={executando ? faSpinner : faCirclePause} spin={executando} />
            Pausar
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Status + Pipelines ──────────────────────────────────────────────────────

function StatusGeral({ status, pipelines }) {
  const globalPausado = pipelines.find((p) => p.pipeline === 'global')?.ativo === false;

  return (
    <div
      className="rounded-2xl border px-4 py-3"
      style={{
        borderColor: globalPausado ? 'var(--color-danger)' : 'var(--border-soft)',
        backgroundColor: 'var(--bg-surface-soft)',
      }}
    >
      <div className="flex flex-wrap items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
        <FontAwesomeIcon
          icon={globalPausado ? faCirclePause : faBrain}
          style={{ color: globalPausado ? 'var(--color-danger)' : 'var(--color-success)' }}
        />
        <span className="font-semibold">
          {globalPausado ? 'IA pausada' : 'IA ativa'}
        </span>
        <span style={{ color: 'var(--text-muted)' }}>·</span>
        <span style={{ color: 'var(--text-muted)' }}>
          última atualização {relativo(status?.ultimoPdfBaixadoEm || status?.ultimaSyncEm)}
        </span>
      </div>
    </div>
  );
}

function ListaPipelines({ pipelines, acaoPipeline, onPausar, onRetomar }) {
  if (!pipelines?.length) return null;

  return (
    <div className="space-y-2">
      {pipelines.map((p) => {
        const acao = acaoPipeline[p.pipeline];
        const podePausar = p.ativo;
        return (
          <div
            key={p.pipeline}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3"
            style={{
              borderColor: p.ativo ? 'var(--border-soft)' : 'var(--color-warning)',
              backgroundColor: 'var(--bg-surface-soft)',
            }}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon
                  icon={p.ativo ? faCircleCheck : faCirclePause}
                  style={{ color: p.ativo ? 'var(--color-success)' : 'var(--color-warning)' }}
                />
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {p.label}
                </p>
              </div>
              {!p.ativo && (
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Pausado {relativo(p.pausadoEm)}
                  {p.pausadoPor?.nome && ` por ${p.pausadoPor.nome}`}
                  {p.motivoPausa && ` · ${p.motivoPausa}`}
                </p>
              )}
            </div>
            {podePausar ? (
              <Button type="button" variant="secondary" onClick={() => onPausar(p.pipeline, p.label)} disabled={!!acao}>
                <FontAwesomeIcon icon={acao === 'pausando' ? faSpinner : faCirclePause} spin={acao === 'pausando'} />
                Pausar
              </Button>
            ) : (
              <Button type="button" variant="primary" onClick={() => onRetomar(p.pipeline)} disabled={!!acao}>
                <FontAwesomeIcon icon={acao === 'retomando' ? faSpinner : faCirclePlay} spin={acao === 'retomando'} />
                Retomar
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Tabela de equipamentos ──────────────────────────────────────────────────

function CorEcobertura(pct) {
  if (pct === null || pct === undefined) return 'var(--text-muted)';
  if (pct >= 80) return 'var(--color-success)';
  if (pct >= 40) return 'var(--color-warning)';
  return 'var(--color-danger)';
}

function TabelaEquipamentos({ equipamentos }) {
  if (!equipamentos?.length) {
    return <InlineEmptyState message="Nenhum equipamento GE vinculado ainda. Configure a integração na aba ao lado." />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr style={{ color: 'var(--text-muted)' }} className="text-left text-xs uppercase tracking-wide">
            <th className="py-2 pr-4">Equipamento</th>
            <th className="py-2 pr-4">Unidade</th>
            <th className="py-2 pr-4 text-right">OSs</th>
            <th className="py-2 pr-4 text-right">PDFs</th>
            <th className="py-2 pr-4 text-right">Cobertura</th>
            <th className="py-2 pr-4">Causas dominantes</th>
            <th className="py-2 pr-4">Última OS</th>
          </tr>
        </thead>
        <tbody>
          {equipamentos.map((eq) => (
            <tr
              key={eq.id}
              className="border-t"
              style={{ borderColor: 'var(--border-soft)', color: 'var(--text-primary)' }}
            >
              <td className="py-2 pr-4">
                <div className="font-medium">{eq.apelido || eq.tag || '—'}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {eq.modelo || '—'}
                </div>
              </td>
              <td className="py-2 pr-4" style={{ color: 'var(--text-muted)' }}>
                {eq.unidade || '—'}
              </td>
              <td className="py-2 pr-4 text-right tabular-nums">{eq.totalOs}</td>
              <td className="py-2 pr-4 text-right tabular-nums">{eq.pdfsBaixados}</td>
              <td
                className="py-2 pr-4 text-right tabular-nums font-medium"
                style={{ color: CorEcobertura(eq.coberturaPct) }}
              >
                {eq.coberturaPct === null ? '—' : `${eq.coberturaPct}%`}
              </td>
              <td className="py-2 pr-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                {eq.causasTop?.length
                  ? eq.causasTop.map((c) => `${c.total}× ${labelCausa(c.categoria)}`).join(' · ')
                  : '—'}
              </td>
              <td className="py-2 pr-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                {eq.ultimaOsEm ? formatarDataHora(eq.ultimaOsEm) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Bloco de causas-raiz agregadas ─────────────────────────────────────────

function CausasAgregadas({ causas }) {
  if (!causas?.length) {
    return (
      <InlineEmptyState message="A IA ainda nao identificou causas-raiz. Conforme PDFs forem extraidos, esta visao se preenche." />
    );
  }

  const total = causas.reduce((acc, c) => acc + c.total, 0);

  return (
    <div className="space-y-2">
      {causas.map((c) => {
        const pct = total > 0 ? Math.round((c.total / total) * 100) : 0;
        return (
          <div key={c.categoria} className="space-y-1">
            <div className="flex items-baseline justify-between text-sm">
              <span style={{ color: 'var(--text-primary)' }}>{labelCausa(c.categoria)}</span>
              <span style={{ color: 'var(--text-muted)' }} className="text-xs tabular-nums">
                {c.total} OS · {pct}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded" style={{ backgroundColor: 'var(--bg-surface-soft)' }}>
              <div
                className="h-full"
                style={{ width: `${pct}%`, backgroundColor: 'var(--brand-primary)' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Feed de atividade ───────────────────────────────────────────────────────

function FeedAtividade({ itens }) {
  if (!itens?.length) {
    return (
      <InlineEmptyState message="A IA ainda nao processou nenhuma OS GE. O cron diario roda as 04:00 UTC." />
    );
  }

  return (
    <ul className="space-y-1.5">
      {itens.map((item) => {
        const isFalha     = item.tipo === 'pdf_falha';
        const isPendente  = item.tipo === 'pdf_pendente';
        const icon        = isFalha ? faTriangleExclamation : (isPendente ? faClockRotateLeft : faFilePdf);
        const cor         = isFalha ? 'var(--color-danger)' : (isPendente ? 'var(--text-muted)' : 'var(--color-success)');

        return (
          <li
            key={item.id}
            className="flex items-start gap-2 rounded-xl border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-soft)' }}
          >
            <FontAwesomeIcon icon={icon} className="mt-0.5 shrink-0" style={{ color: cor }} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span style={{ color: 'var(--text-muted)' }} className="text-xs tabular-nums">
                  {formatarDataHora(item.ocorridoEm)}
                </span>
                <span style={{ color: 'var(--text-primary)' }} className="font-medium">
                  {item.equipamento || '—'}
                </span>
                <span style={{ color: 'var(--text-muted)' }} className="text-xs">
                  · OS {item.gehcServiceId}
                </span>
              </div>
              {item.problema && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {item.problema}
                </p>
              )}
              {isFalha && item.ultimoErro && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-danger)' }}>
                  {item.ultimoErro} (tentativas: {item.tentativas})
                </p>
              )}
              {!isFalha && !isPendente && item.fileName && (
                <a
                  href={urlPdfDocumento(item.fileName.replace(/\.pdf$/i, '').split('_').pop())}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs underline"
                  style={{ color: 'var(--brand-primary)' }}
                >
                  Abrir PDF original
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

function GehcAprendizadoTab() {
  const {
    status, pipelines, equipamentos, atividade, causas,
    loading, error,
    acaoPipeline, pausar, retomar,
  } = useGehcAprendizado();

  const [dialogo, setDialogo] = useState(null); // { pipeline, label } | null

  if (loading) return <LoadingState message="Carregando dados da IA..." />;

  if (error) {
    return (
      <div
        className="flex items-start gap-3 rounded-2xl border px-4 py-4"
        style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-soft)' }}
      >
        <FontAwesomeIcon icon={faCircleExclamation} className="mt-0.5" style={{ color: 'var(--color-warning)' }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Não foi possível carregar</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <StatusGeral status={status} pipelines={pipelines} />

      {/* KPIs */}
      {/*
        Convertemos para string porque InfoCard interpreta `0` como falsy
        e renderiza "N/A". Para esta tela queremos ver explicitamente "0"
        (zero PDFs, zero falhas) — significa "sistema funcionando, ainda
        sem dados", não "informacao indisponivel".
      */}
      <ResponsiveGrid cols={{ base: 2, md: 4 }}>
        <InfoCard
          icon={faFilePdf}
          label="OSs sincronizadas"
          value={String(status?.totalOs ?? 0)}
        />
        <InfoCard
          icon={faFilePdf}
          label="PDFs baixados"
          value={String(status?.pdfsBaixados ?? 0)}
        />
        <InfoCard
          icon={faMagnifyingGlassChart}
          label="PDFs analisados"
          value={String(status?.pdfsExtraidos ?? 0)}
        />
        <InfoCard
          icon={faBrain}
          label="Causas identificadas"
          value={String(status?.pdfsComCausaCategoria ?? 0)}
        />
      </ResponsiveGrid>

      {/* Pipelines (kill switch e por pipeline) */}
      <PageSection
        title="Pipelines da IA"
        description="Controles automáticos. Pause se precisar fazer manutenção; despause depois — o estado fica registrado em auditoria."
      >
        <ListaPipelines
          pipelines={pipelines}
          acaoPipeline={acaoPipeline}
          onPausar={(pipeline, label) => setDialogo({ pipeline, label })}
          onRetomar={(pipeline) => retomar(pipeline)}
        />
      </PageSection>

      {/* Causas-raiz dominantes */}
      <PageSection
        title="Padrões de causa-raiz"
        description="Categorias normalizadas que a IA identificou nos PDFs analisados. Use para enxergar o que mais derruba sua frota."
      >
        <CausasAgregadas causas={causas} />
      </PageSection>

      {/* Equipamentos */}
      <PageSection
        title="Equipamentos analisados"
        description="Cobertura de PDF por equipamento + causas dominantes. Menor cobertura primeiro — esses são os que a IA tem menos contexto para aprender."
      >
        <TabelaEquipamentos equipamentos={equipamentos} />
      </PageSection>

      {/* Atividade recente */}
      <PageSection
        title="Atividade recente da IA"
        description="Últimas 50 captações de PDF (sucessos e falhas). Atualiza automaticamente a cada minuto."
      >
        <FeedAtividade itens={atividade} />
      </PageSection>

      {dialogo && (
        <DialogoPausa
          pipeline={dialogo.pipeline}
          label={dialogo.label}
          executando={acaoPipeline[dialogo.pipeline] === 'pausando'}
          onCancelar={() => setDialogo(null)}
          onConfirmar={async (motivo) => {
            await pausar(dialogo.pipeline, { motivo });
            setDialogo(null);
          }}
        />
      )}
    </div>
  );
}

export default GehcAprendizadoTab;
