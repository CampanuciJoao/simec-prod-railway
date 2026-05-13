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
  faLightbulb,
  faThumbsUp,
  faThumbsDown,
  faCheck,
  faBolt,
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

function formatarDuracao(ms) {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60_000)}min`;
}

// Mapa categoria normalizada -> label PT-BR amigavel.
const LABELS_CAUSAS = {
  infra_chiller_cliente: 'Chiller externo de água gelada (cliente)',
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

function ListaPipelines({ pipelines, acaoPipeline, feedbackPipeline, onPausar, onRetomar, onDisparar }) {
  if (!pipelines?.length) return null;

  return (
    <div className="space-y-2">
      {pipelines.map((p) => {
        const acao = acaoPipeline[p.pipeline];
        const feedback = feedbackPipeline?.[p.pipeline];
        const podePausar = p.ativo;
        // Pipeline 'global' nao tem job para disparar — e so kill switch.
        const podeDisparar = p.ativo && p.pipeline !== 'global';
        // Cor da borda muda quando ha feedback recente (pisca destaque).
        const borderColor = feedback?.tipo === 'success'
          ? 'var(--color-success)'
          : feedback?.tipo === 'error'
            ? 'var(--color-danger)'
            : (p.ativo ? 'var(--border-soft)' : 'var(--color-warning)');
        return (
          <div
            key={p.pipeline}
            className="rounded-2xl border px-4 py-3 transition-colors"
            style={{ borderColor, backgroundColor: 'var(--bg-surface-soft)' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
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
                {p.ativo && p.ultimaExecucaoEm && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <FontAwesomeIcon
                      icon={p.ultimaExecucaoOk ? faCircleCheck : faTriangleExclamation}
                      className="mr-1"
                      style={{
                        color: p.ultimaExecucaoOk ? 'var(--color-success)' : 'var(--color-danger)',
                      }}
                    />
                    Última execução: {p.ultimaExecucaoOk ? 'ok' : 'falhou'} {relativo(p.ultimaExecucaoEm)}
                    {p.ultimaExecucaoMensagem && ` · ${p.ultimaExecucaoMensagem}`}
                    {p.ultimaExecucaoDuracaoMs != null && ` · ${formatarDuracao(p.ultimaExecucaoDuracaoMs)}`}
                  </p>
                )}
                {p.ativo && !p.ultimaExecucaoEm && p.pipeline !== 'global' && (
                  <p className="mt-1 text-xs italic" style={{ color: 'var(--text-muted)' }}>
                    Aguardando primeira execução
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {podeDisparar && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onDisparar(p.pipeline)}
                    disabled={!!acao}
                    title="Forçar execução agora (sem esperar o cron)"
                  >
                    <FontAwesomeIcon
                      icon={acao === 'disparando' ? faSpinner : faBolt}
                      spin={acao === 'disparando'}
                    />
                    <span className="ml-1 text-xs">
                      {acao === 'disparando' ? 'Enfileirando...' : 'Rodar agora'}
                    </span>
                  </Button>
                )}
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
            </div>

            {/* Feedback inline pos-disparo: confirma enfileiramento + tempo estimado */}
            {feedback && (
              <div
                className="mt-2 flex items-start gap-2 rounded-xl px-3 py-2 text-xs"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  color: feedback.tipo === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
                  borderLeft: `3px solid ${feedback.tipo === 'success' ? 'var(--color-success)' : 'var(--color-danger)'}`,
                }}
              >
                <FontAwesomeIcon
                  icon={feedback.tipo === 'success' ? faCircleCheck : faTriangleExclamation}
                  className="mt-0.5 shrink-0"
                />
                <span style={{ color: 'var(--text-primary)' }}>{feedback.mensagem}</span>
              </div>
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

// ─── Bloco de insights da IA ────────────────────────────────────────────────

const CORES_SEVERIDADE = {
  critical: 'var(--color-danger)',
  high:     'var(--color-danger)',
  medium:   'var(--color-warning)',
  low:      'var(--text-muted)',
  info:     'var(--text-muted)',
};

const LABELS_TIPO_INSIGHT = {
  reincidencia_causa:       'Reincidência de causa',
  anomalia_helio:           'Anomalia de hélio',
  risco_alto:               'Risco alto',
  sem_pm_recente:           'Sem preventiva recente',
  acionamento_freq_terceiro: 'Acionamento frequente de terceiro',
};

function CartaoInsight({ insight, onFeedback, onResolver, onDescartar }) {
  const cor = CORES_SEVERIDADE[insight.severidade] || 'var(--text-muted)';
  const eq  = insight.equipamento;
  return (
    <div
      className="rounded-2xl border px-4 py-3 space-y-2"
      style={{ borderColor: cor, backgroundColor: 'var(--bg-surface-soft)' }}
    >
      <div className="flex items-start gap-2">
        <FontAwesomeIcon icon={faLightbulb} className="mt-1 shrink-0" style={{ color: cor }} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {insight.titulo}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              · {LABELS_TIPO_INSIGHT[insight.tipo] || insight.tipo}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {eq?.apelido || eq?.tag || '—'} ({eq?.modelo || '—'}) · há {relativo(insight.geradoEm)}
          </p>
        </div>
      </div>

      <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{insight.descricao}</p>

      {insight.recomendacao && (
        <p className="text-sm rounded-xl px-3 py-2"
           style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', borderLeft: `3px solid ${cor}` }}>
          <strong>Recomendação:</strong> {insight.recomendacao}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>Útil?</span>
          <button
            type="button"
            onClick={() => onFeedback(insight.id, true)}
            className="rounded px-2 py-1 hover:bg-white/5"
            style={{ color: insight.feedbackUtil === true ? 'var(--color-success)' : 'var(--text-muted)' }}
          >
            <FontAwesomeIcon icon={faThumbsUp} />
          </button>
          <button
            type="button"
            onClick={() => onFeedback(insight.id, false)}
            className="rounded px-2 py-1 hover:bg-white/5"
            style={{ color: insight.feedbackUtil === false ? 'var(--color-danger)' : 'var(--text-muted)' }}
          >
            <FontAwesomeIcon icon={faThumbsDown} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onDescartar(insight.id)}
            title="Descartar — sinaliza para a IA que este insight era falso positivo"
          >
            <FontAwesomeIcon icon={faTriangleExclamation} />
            <span className="ml-1 text-xs">Descartar (incorreto)</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onResolver(insight.id)}
            title="Marcar como resolvido — sinaliza que o problema real foi tratado"
          >
            <FontAwesomeIcon icon={faCheck} />
            <span className="ml-1 text-xs">Marcar resolvido</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

function ListaInsights({ insights, onFeedback, onResolver, onDescartar }) {
  if (!insights?.length) {
    return (
      <InlineEmptyState message="A IA ainda nao gerou insights. Conforme eventos forem acumulados (PDFs extraidos + telemetria), padroes vao aparecer aqui." />
    );
  }
  return (
    <div className="space-y-3">
      {insights.map((ins) => (
        <CartaoInsight
          key={ins.id}
          insight={ins}
          onFeedback={onFeedback}
          onResolver={onResolver}
          onDescartar={onDescartar}
        />
      ))}
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
    status, pipelines, equipamentos, atividade, causas, insights,
    loading, error,
    acaoPipeline, feedbackPipeline,
    pausar, retomar, disparar,
    darFeedbackInsight, resolverInsight, descartarInsight,
    limparTodosInsights, descartarTodosInsights,
    resetarExtracoes,
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
          feedbackPipeline={feedbackPipeline}
          onPausar={(pipeline, label) => setDialogo({ pipeline, label })}
          onRetomar={(pipeline) => retomar(pipeline)}
          onDisparar={(pipeline) => disparar(pipeline)}
        />
      </PageSection>

      {/* Insights da IA */}
      <PageSection
        title="Insights da IA"
        description="Recomendações geradas automaticamente. Marque útil/inútil para a IA aprender com seu feedback."
        actions={
          insights?.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={async () => {
                  if (!window.confirm(`Descartar todos os ${insights.length} insights como incorretos? A IA recebe feedback negativo (não-útil) para todos.`)) return;
                  const r = await descartarTodosInsights('descarte_manual_admin');
                  window.alert(`${r?.descartados ?? 0} insight(s) descartados.`);
                }}
                title="Descarta como falso positivo: marca feedbackUtil=false para a IA aprender que estavam errados"
              >
                Descartar todos como incorretos
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={async () => {
                  if (!window.confirm(`Limpar todos os ${insights.length} insights ativos? Trata como 'resolvidos' (engenheiro tomou ação). A próxima geração só recriará os que ainda forem válidos.`)) return;
                  const r = await limparTodosInsights('limpeza_manual_admin');
                  window.alert(`${r?.resolvidos ?? 0} insight(s) marcados como resolvidos.`);
                }}
              >
                Limpar todos (resolvidos)
              </Button>
            </div>
          ) : null
        }
      >
        <ListaInsights
          insights={insights}
          onFeedback={darFeedbackInsight}
          onResolver={resolverInsight}
          onDescartar={descartarInsight}
        />
      </PageSection>

      {/* Causas-raiz dominantes */}
      <PageSection
        title="Padrões de causa-raiz"
        description="Categorias normalizadas que a IA identificou nos PDFs analisados. Use para enxergar o que mais derruba sua frota."
        actions={
          <Button
            type="button"
            variant="ghost"
            onClick={async () => {
              if (!window.confirm('Resetar a análise de causa-raiz? Apaga todas as extrações dos PDFs + eventos derivados + embeddings. Os PDFs originais permanecem; rode "Extração LLM" depois para reprocessar do zero.')) return;
              const r = await resetarExtracoes('reset_manual_admin');
              window.alert(`Reset concluído.\n• ${r?.extracoesRemovidas ?? 0} extrações apagadas\n• ${r?.eventosRemovidos ?? 0} eventos do KL removidos\n• ${r?.embeddingsRemovidos ?? 0} embeddings limpos\n• ${r?.insightsResolvidos ?? 0} insights resolvidos\n\nRode "Extração LLM" para reprocessar.`);
            }}
            title="Apaga as extrações e eventos derivados de PDF; PDFs originais ficam preservados"
          >
            Resetar análise
          </Button>
        }
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
