import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowsRotate,
  faCircleCheck,
  faCircleExclamation,
  faCircleXmark,
  faHeartPulse,
  faLink,
  faLinkSlash,
  faRotate,
  faSpinner,
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
import { useIntegracoesGehc } from '@/hooks/gerenciamento/useIntegracoesGehc';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ResultBanner({ result, nomeAcao }) {
  if (!result) return null;
  const cor    = result.ok ? 'var(--color-success)' : 'var(--color-danger)';
  const icon   = result.ok ? faCircleCheck : faCircleXmark;
  const titulo = result.ok ? `${nomeAcao} concluído` : `Erro em ${nomeAcao.toLowerCase()}`;

  return (
    <div
      className="flex items-start gap-3 rounded-2xl border px-4 py-3"
      style={{ borderColor: cor, backgroundColor: 'var(--bg-surface-soft)' }}
    >
      <FontAwesomeIcon icon={icon} className="mt-0.5 shrink-0" style={{ color: cor }} />
      <div className="min-w-0 text-sm" style={{ color: 'var(--text-primary)' }}>
        <p className="font-semibold">{titulo}</p>
        {result.error && <p className="mt-0.5" style={{ color: 'var(--text-muted)' }}>{result.error}</p>}
        {result.ok && result.vinculados !== undefined && (
          <p className="mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {result.vinculados} vinculado(s) · {result.jaVinculados} já vinculado(s) · {result.semMatch} sem match
            {result.modo && <span> · via {result.modo === 'graphql' ? 'API GraphQL' : 'Playwright'}</span>}
          </p>
        )}
        {result.ok && result.total !== undefined && result.vinculados === undefined && (
          <p className="mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {result.total} equipamento(s) sincronizado(s)
          </p>
        )}
        {result.ok && result.mensagem && (
          <p className="mt-0.5" style={{ color: 'var(--text-muted)' }}>{result.mensagem}</p>
        )}
      </div>
    </div>
  );
}

function StatusAuth({ auth }) {
  if (!auth) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  if (!auth.configurado) {
    return (
      <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-warning)' }}>
        <FontAwesomeIcon icon={faCircleExclamation} />
        Não autenticado
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--color-success)' }}>
      <FontAwesomeIcon icon={faCircleCheck} />
      Ativo
      {auth.capturedAt && (
        <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
          · capturado {formatarDataHora(auth.capturedAt)}
        </span>
      )}
    </span>
  );
}

// ─── Seção: equipamentos sem match ────────────────────────────────────────────

function ListaSemVinculo({ lista }) {
  if (!lista?.length) return <InlineEmptyState message="Todos os equipamentos GE estão vinculados." />;
  return (
    <div className="space-y-2">
      {lista.map((eq) => (
        <div
          key={eq.id}
          className="flex items-center justify-between rounded-2xl border px-4 py-3"
          style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-soft)' }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {eq.apelido || eq.tag}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Tag: {eq.tag} · {eq.modelo || 'modelo não informado'}
            </p>
          </div>
          <FontAwesomeIcon icon={faLinkSlash} style={{ color: 'var(--color-warning)' }} />
        </div>
      ))}
    </div>
  );
}

// ─── Seção: últimos snapshots ─────────────────────────────────────────────────

function UltimosSnapshots({ snapshots }) {
  if (!snapshots?.length) return <InlineEmptyState message="Nenhum snapshot capturado ainda." />;
  return (
    <div className="space-y-2">
      {snapshots.map((s, i) => (
        <div
          key={i}
          className="rounded-2xl border px-4 py-3"
          style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-soft)' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {s.equipamento}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {formatarDataHora(s.capturedAt)}
            </p>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            {s.heliumLevelPct != null && (
              <span style={{ color: s.heliumLevelPct < 30 ? 'var(--color-danger)' : s.heliumLevelPct < 70 ? 'var(--color-warning)' : 'var(--color-success)', fontWeight: 600 }}>
                Hélio: {s.heliumLevelPct}%
              </span>
            )}
            {s.compressorStatus && <span>Compressor: {s.compressorStatus}</span>}
            {s.coolantTempC != null && <span>Temp: {s.coolantTempC}°C</span>}
            <span style={{ color: s.equipmentOnline ? 'var(--color-success)' : 'var(--color-danger)' }}>
              {s.equipmentOnline === true ? 'Online' : s.equipmentOnline === false ? 'Offline' : ''}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

function IntegracoesPage() {
  const {
    status, loading, error, carregarStatus,
    rodarDiscovery, runningDiscovery, resultDiscovery,
    rodarSync,      runningSync,      resultSync,
    rodarMonitor,   runningMonitor,   resultMonitor,
  } = useIntegracoesGehc();

  if (loading) return <LoadingState message="Carregando status da integração GE..." />;

  if (error && !status) {
    return (
      <div
        className="flex items-start gap-3 rounded-2xl border px-4 py-4"
        style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-soft)' }}
      >
        <FontAwesomeIcon icon={faCircleExclamation} className="mt-0.5" style={{ color: 'var(--color-warning)' }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Não foi possível carregar o status
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{error}</p>
        </div>
      </div>
    );
  }

  const anyRunning = runningDiscovery || runningSync || runningMonitor;

  return (
    <div className="space-y-6">

      {/* ── KPIs ── */}
      <ResponsiveGrid cols={{ base: 1, md: 2, xl: 4 }}>
        <InfoCard
          icon={faHeartPulse}
          label="RMs GE cadastradas"
          value={status?.rmsGe?.total ?? 0}
        />
        <InfoCard
          icon={faLink}
          label="Vinculadas ao portal GE"
          value={status?.rmsGe?.vinculadas ?? 0}
        />
        <InfoCard
          icon={faLinkSlash}
          label="Sem vínculo"
          value={status?.rmsGe?.semVinculo ?? 0}
        />
        <InfoCard
          icon={faHeartPulse}
          label="Alertas ativos (GE)"
          value={status?.alertasAtivos ?? 0}
        />
      </ResponsiveGrid>

      {/* ── Ações ── */}
      <PageSection
        title="GE Health Cloud"
        description="Gerencie a conexão com o portal MyEquipment 360 da GE Healthcare."
      >
        <div className="space-y-4">

          {/* Status auth */}
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3"
            style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-soft)' }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Autenticação
              </p>
              <div className="mt-1">
                <StatusAuth auth={status?.auth} />
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={carregarStatus}
              disabled={anyRunning}
            >
              <FontAwesomeIcon icon={faArrowsRotate} />
              Atualizar
            </Button>
          </div>

          {/* Botões de ação */}
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="primary"
              onClick={rodarDiscovery}
              disabled={anyRunning}
            >
              <FontAwesomeIcon icon={runningDiscovery ? faSpinner : faLink} spin={runningDiscovery} />
              {runningDiscovery ? 'Vinculando...' : 'Vincular equipamentos'}
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={rodarSync}
              disabled={anyRunning}
            >
              <FontAwesomeIcon icon={runningSync ? faSpinner : faRotate} spin={runningSync} />
              {runningSync ? 'Sincronizando...' : 'Sincronizar dados'}
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={rodarMonitor}
              disabled={anyRunning}
            >
              <FontAwesomeIcon icon={runningMonitor ? faSpinner : faHeartPulse} spin={runningMonitor} />
              {runningMonitor ? 'Capturando...' : 'Capturar saúde agora'}
            </Button>
          </div>

          <div
            className="rounded-2xl px-4 py-2 text-xs"
            style={{ backgroundColor: 'var(--bg-surface-soft)', color: 'var(--text-muted)' }}
          >
            <strong>Vincular equipamentos</strong> — conecta as RMs GE do SIMEC ao portal MyEquipment 360 por número de série.
            {' '}<strong>Sincronizar dados</strong> — importa contratos, histórico de OS e utilização mensal.
            {' '}<strong>Capturar saúde</strong> — força leitura imediata de hélio, pressão e compressor (automático a cada 2h).
          </div>

          {/* Resultados das ações */}
          <ResultBanner result={resultDiscovery} nomeAcao="Discovery" />
          <ResultBanner result={resultSync}      nomeAcao="Sync" />
          <ResultBanner result={resultMonitor}   nomeAcao="Monitoramento" />
        </div>
      </PageSection>

      {/* ── Equipamentos sem vínculo ── */}
      {(status?.rmsGe?.semVinculo ?? 0) > 0 && (
        <PageSection
          title={`Equipamentos sem vínculo (${status.rmsGe.semVinculo})`}
          description="RMs GE cadastradas no SIMEC que ainda não foram localizadas no portal MyEquipment 360."
        >
          <ListaSemVinculo lista={status?.rmsSeVinculo} />
        </PageSection>
      )}

      {/* ── Últimos snapshots ── */}
      <PageSection
        title="Últimas capturas de saúde"
        description={`${status?.snapshots?.total ?? 0} snapshot(s) no total. Exibindo os 10 mais recentes.`}
      >
        <UltimosSnapshots snapshots={status?.ultimosSnapshots} />
      </PageSection>

    </div>
  );
}

export default IntegracoesPage;
