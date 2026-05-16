import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBrain,
  faCircleCheck,
  faCirclePause,
  faCirclePlay,
  faCircleExclamation,
  faFilePdf,
  faSpinner,
  faCircleNotch,
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
  ModalConfirmacao,
  PageSection,
  ResponsiveGrid,
} from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import { formatarDataHora } from '@/utils/timeUtils';
import { useGehcAprendizado } from '@/hooks/gerenciamento/useGehcAprendizado';
import { urlPdfDocumento, getExtracoesDiagnostico, getCausaDetalhe } from '@/services/api/gehcAprendizadoApi';

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

// Formata duracao em ms para "Xs" / "Xm Ys" (compacto, sem zeros a esquerda).
function formatarDecorrido(ms) {
  if (!ms || ms < 0) return '0s';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r === 0 ? `${m}m` : `${m}m ${r}s`;
}

// Re-renderiza a cada segundo enquanto houver pelo menos uma acao em curso.
// Sem isso o contador "Executando · 1m23s" ficaria parado ate o front
// receber um refresh externo. Para quando nada mais esta rodando.
function useTickEnquantoAtivo(ativo, intervaloMs = 1000) {
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!ativo) return undefined;
    const id = setInterval(() => forceTick((n) => n + 1), intervaloMs);
    return () => clearInterval(id);
  }, [ativo, intervaloMs]);
}

function ListaPipelines({
  pipelines,
  acaoPipeline,
  acaoIniciadaEm,
  feedbackPipeline,
  onPausar,
  onRetomar,
  onDisparar,
}) {
  // Mantem o contador vivo enquanto qualquer pipeline esta disparando.
  const algumDisparando = Object.values(acaoPipeline || {}).some((a) => a === 'disparando');
  useTickEnquantoAtivo(algumDisparando);

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
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
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
              {/* Botoes: full-width em mobile (ficam mais legiveis e nao cortam),
                  inline em sm+ */}
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                {podeDisparar && (() => {
                  const disparando = acao === 'disparando';
                  const inicio = acaoIniciadaEm?.[p.pipeline];
                  const decorridoMs = disparando && inicio ? Date.now() - inicio : 0;
                  return (
                    <Button
                      type="button"
                      variant={disparando ? 'primary' : 'ghost'}
                      onClick={() => onDisparar(p.pipeline)}
                      disabled={!!acao}
                      title={
                        disparando
                          ? 'Job em execução — aguarde concluir'
                          : 'Forçar execução agora (sem esperar o cron)'
                      }
                      className={`w-full justify-center sm:w-auto ${
                        disparando ? 'animate-pulse ring-2 ring-offset-1' : ''
                      }`}
                      style={
                        disparando
                          ? { '--tw-ring-color': 'var(--brand-primary)' }
                          : undefined
                      }
                    >
                      <FontAwesomeIcon
                        icon={disparando ? faCircleNotch : faBolt}
                        spin={disparando}
                      />
                      <span className="ml-1.5 text-xs tabular-nums">
                        {disparando
                          ? `Executando · ${formatarDecorrido(decorridoMs)}`
                          : 'Rodar agora'}
                      </span>
                    </Button>
                  );
                })()}
                {podePausar ? (
                  <Button
                    type="button"
                    variant={acao === 'disparando' ? 'danger' : 'secondary'}
                    onClick={() => onPausar(p.pipeline, p.label)}
                    disabled={acao === 'pausando'}
                    title={
                      acao === 'disparando'
                        ? 'Pausa imediata — interrompe a execução em curso no próximo equipamento'
                        : 'Pausar este pipeline'
                    }
                    className="w-full justify-center sm:w-auto"
                  >
                    <FontAwesomeIcon icon={acao === 'pausando' ? faSpinner : faCirclePause} spin={acao === 'pausando'} />
                    {acao === 'disparando' ? 'Parar agora' : 'Pausar'}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => onRetomar(p.pipeline)}
                    disabled={!!acao}
                    className="w-full justify-center sm:w-auto"
                  >
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

function CausasAgregadas({ causas, onSelecionarCategoria }) {
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
          <button
            key={c.categoria}
            type="button"
            onClick={() => onSelecionarCategoria?.(c.categoria)}
            className="w-full space-y-1 rounded-lg p-2 text-left transition-colors hover:bg-white/5"
            title={`Ver as ${c.total} OS classificadas como ${labelCausa(c.categoria)}`}
          >
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
          </button>
        );
      })}
    </div>
  );
}

// ─── Drawer de drill-down ────────────────────────────────────────────────────

function DrillDownCausa({ categoria, items, totalPdfs, loading, onClose }) {
  if (!categoria) return null;

  const totalOs = items?.length ?? 0;
  const sufixoPdfs = totalPdfs && totalPdfs !== totalOs ? ` · ${totalPdfs} PDFs analisados` : '';

  return (
    <div
      className="fixed inset-0 z-[1100] flex justify-end backdrop-blur-[2px]"
      style={{ backgroundColor: 'rgba(2, 6, 23, 0.55)' }}
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-2xl overflow-y-auto p-4 sm:p-6"
        style={{ backgroundColor: 'var(--bg-surface)', boxShadow: 'var(--shadow-lg)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              Causa-raiz · {totalOs} OS{sufixoPdfs}
            </p>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {labelCausa(categoria)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm"
            style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-surface-soft)' }}
          >
            Fechar
          </button>
        </div>

        {loading && <LoadingState message="Carregando OSs..." />}

        {!loading && (!items || items.length === 0) && (
          <InlineEmptyState message="Nenhuma OS encontrada nessa categoria." />
        )}

        {!loading && items && items.length > 0 && (
          <ul className="space-y-3">
            {items.map((it) => (
              <li
                key={it.id}
                className="rounded-xl border p-3"
                style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-soft)' }}
              >
                <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {it.equipamento?.apelido || it.equipamento?.tag || '—'}
                    <span className="ml-2 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>
                      ({it.equipamento?.modelo || '—'})
                    </span>
                  </div>
                  <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    OS {it.gehcServiceId || it.trackingNumber || '—'}
                  </span>
                </div>

                <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {it.openedAt && <span>Aberta em {new Date(it.openedAt).toLocaleDateString('pt-BR')}</span>}
                  {it.engineerFullName && <span>Eng.: {it.engineerFullName}</span>}
                  {it.serviceTypeCode && <span>Tipo: {it.serviceTypeCode}</span>}
                  {typeof it.llmConfianca === 'number' && (
                    <span title="Confiança do LLM nesta classificação">
                      Confiança LLM: {Math.round(it.llmConfianca * 100)}%
                    </span>
                  )}
                </div>

                {it.llmRaciocinio && (
                  <p
                    className="mb-2 rounded-lg border-l-4 p-2 text-xs italic"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--brand-primary)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <strong>Raciocínio do LLM:</strong> {it.llmRaciocinio}
                  </p>
                )}

                {it.rootCauseRaw && (
                  <p className="mb-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <strong>Causa-raiz reportada:</strong> {it.rootCauseRaw}
                  </p>
                )}

                {it.problemReported && (
                  <p className="mb-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <strong>Problema:</strong>{' '}
                    {it.problemReported.length > 280 ? `${it.problemReported.slice(0, 280)}...` : it.problemReported}
                  </p>
                )}

                {it.actionsTaken && (
                  <p className="mb-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <strong>Ações tomadas:</strong>{' '}
                    {it.actionsTaken.length > 280 ? `${it.actionsTaken.slice(0, 280)}...` : it.actionsTaken}
                  </p>
                )}

                {Array.isArray(it.partsReplaced) && it.partsReplaced.length > 0 && (
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <strong>Peças trocadas:</strong> {it.partsReplaced.join(', ')}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
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
              {!isFalha && !isPendente && item.temArquivoR2 && item.fileName && (
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
    acaoPipeline, acaoIniciadaEm, feedbackPipeline,
    pausar, retomar, disparar,
    darFeedbackInsight, resolverInsight, descartarInsight,
    limparTodosInsights, descartarTodosInsights,
    resetarExtracoes,
  } = useGehcAprendizado();

  const [dialogo, setDialogo] = useState(null); // { pipeline, label } | null
  // Confirmações destrutivas em batch — uma flag por ação
  const [confirmacao, setConfirmacao] = useState(null); // 'descartar' | 'limpar' | 'resetar' | null
  const [executandoBatch, setExecutandoBatch] = useState(false);
  const [diagnostico, setDiagnostico] = useState(null);
  const [carregandoDiagnostico, setCarregandoDiagnostico] = useState(false);
  const [drillCategoria, setDrillCategoria] = useState(null);
  const [drillItems, setDrillItems] = useState([]);
  const [carregandoDrill, setCarregandoDrill] = useState(false);
  const { addToast } = useToast();

  const abrirDrillDown = async (categoria) => {
    setDrillCategoria(categoria);
    setDrillItems([]);
    setCarregandoDrill(true);
    try {
      const data = await getCausaDetalhe(categoria);
      setDrillItems(data?.items || []);
    } catch (err) {
      addToast(err?.response?.data?.error || err.message || 'Falha ao carregar OSs.', 'error');
    } finally {
      setCarregandoDrill(false);
    }
  };

  const fecharDrillDown = () => {
    setDrillCategoria(null);
    setDrillItems([]);
  };

  const carregarDiagnostico = async () => {
    setCarregandoDiagnostico(true);
    try {
      const data = await getExtracoesDiagnostico();
      setDiagnostico(data);
    } catch (err) {
      addToast(err?.response?.data?.error || err.message || 'Falha ao buscar diagnóstico.', 'error');
    } finally {
      setCarregandoDiagnostico(false);
    }
  };

  const fecharConfirmacao = () => {
    if (executandoBatch) return;
    setConfirmacao(null);
  };

  const executarConfirmacao = async () => {
    setExecutandoBatch(true);
    try {
      if (confirmacao === 'descartar') {
        const r = await descartarTodosInsights('descarte_manual_admin');
        addToast(`${r?.descartados ?? 0} insight(s) descartado(s) como incorretos.`, 'success');
      } else if (confirmacao === 'limpar') {
        const r = await limparTodosInsights('limpeza_manual_admin');
        addToast(`${r?.resolvidos ?? 0} insight(s) marcados como resolvidos.`, 'success');
      } else if (confirmacao === 'resetar') {
        const r = await resetarExtracoes('reset_manual_admin');
        addToast(
          `Reset concluído — ${r?.extracoesRemovidas ?? 0} extrações, ${r?.eventosRemovidos ?? 0} eventos, ${r?.embeddingsRemovidos ?? 0} embeddings, ${r?.insightsResolvidos ?? 0} insights.`,
          'success',
        );
      }
      setConfirmacao(null);
    } catch (err) {
      addToast(err?.response?.data?.error || err.message || 'Falha ao executar a ação.', 'error');
    } finally {
      setExecutandoBatch(false);
    }
  };

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
      {/* KPIs: 1 col em mobile estreito (<sm), 2 col em sm, 4 col em md+.
          Antes 'base: 2' apertava demais valores numericos em iPhone SE. */}
      <ResponsiveGrid cols={{ base: 1, sm: 2, md: 4 }}>
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
          acaoIniciadaEm={acaoIniciadaEm}
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
                onClick={() => setConfirmacao('descartar')}
                title="Descarta como falso positivo: marca feedbackUtil=false para a IA aprender que estavam errados"
              >
                Descartar todos como incorretos
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmacao('limpar')}
                title="Marca como resolvidos (problema real foi tratado)"
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
        description="Categorias normalizadas que a IA identificou nos PDFs analisados. Clique em uma categoria para ver as OSs específicas e o raciocínio do LLM."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={carregarDiagnostico}
              disabled={carregandoDiagnostico}
              title="Mostra contagens detalhadas (PDFs baixados, extraídos, com erro) para diagnosticar inconsistências"
            >
              {carregandoDiagnostico ? 'Carregando...' : 'Diagnóstico'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmacao('resetar')}
              title="Apaga as extrações e eventos derivados de PDF; PDFs originais ficam preservados"
            >
              Resetar análise
            </Button>
          </div>
        }
      >
        <CausasAgregadas causas={causas} onSelecionarCategoria={abrirDrillDown} />
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

      <ModalConfirmacao
        isOpen={confirmacao === 'descartar'}
        onClose={fecharConfirmacao}
        onConfirm={executarConfirmacao}
        title="Descartar todos os insights como incorretos?"
        message={`Os ${insights?.length ?? 0} insight(s) ativo(s) receberão feedback negativo (não-útil) e serão fechados. Use isto quando os insights estiverem manifestamente errados — a IA registra o feedback para evolução futura.`}
        confirmText={executandoBatch ? 'Descartando…' : 'Descartar todos'}
        cancelText="Cancelar"
        isDestructive
        confirmDisabled={executandoBatch}
      />

      <ModalConfirmacao
        isOpen={confirmacao === 'limpar'}
        onClose={fecharConfirmacao}
        onConfirm={executarConfirmacao}
        title="Marcar todos os insights como resolvidos?"
        message={`Os ${insights?.length ?? 0} insight(s) ativo(s) serão marcados como resolvidos (engenheiro tomou ação). A próxima execução do gerador só recriará os que ainda forem válidos pela regra atual.`}
        confirmText={executandoBatch ? 'Limpando…' : 'Marcar como resolvidos'}
        cancelText="Cancelar"
        confirmDisabled={executandoBatch}
      />

      <ModalConfirmacao
        isOpen={confirmacao === 'resetar'}
        onClose={fecharConfirmacao}
        onConfirm={executarConfirmacao}
        title="Resetar análise de causa-raiz?"
        message='Apaga todas as extrações dos PDFs, eventos derivados e embeddings. Os PDFs originais permanecem armazenados. Em seguida rode "Extração LLM" no painel de pipelines para reprocessar do zero com a taxonomia atual.'
        confirmText={executandoBatch ? 'Resetando…' : 'Resetar análise'}
        cancelText="Cancelar"
        isDestructive
        confirmDisabled={executandoBatch}
      />

      <DrillDownCausa
        categoria={drillCategoria}
        items={drillItems}
        loading={carregandoDrill}
        onClose={fecharDrillDown}
      />

      <ModalConfirmacao
        isOpen={Boolean(diagnostico)}
        onClose={() => setDiagnostico(null)}
        onConfirm={() => {
          if (diagnostico) {
            navigator.clipboard.writeText(JSON.stringify(diagnostico, null, 2)).catch(() => {});
            addToast('JSON copiado para a área de transferência.', 'success');
          }
        }}
        title="Diagnóstico das extrações"
        message="Estado atual da pipeline de PDFs. Copie o JSON e envie para análise."
        confirmText="Copiar JSON"
        cancelText="Fechar"
      >
        {diagnostico && (
          <pre
            className="max-h-[400px] overflow-auto rounded-lg p-3 text-[11px]"
            style={{
              backgroundColor: 'var(--bg-surface-soft)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {JSON.stringify(diagnostico, null, 2)}
          </pre>
        )}
      </ModalConfirmacao>
    </div>
  );
}

export default GehcAprendizadoTab;
