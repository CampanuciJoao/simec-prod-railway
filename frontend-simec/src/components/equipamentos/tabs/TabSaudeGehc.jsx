import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleCheck,
  faCircleExclamation,
  faCircleXmark,
  faFileContract,
  faGaugeHigh,
  faSnowflake,
  faThermometerHalf,
  faWaveSquare,
  faWifi,
  faWrench,
} from '@fortawesome/free-solid-svg-icons';

import {
  InfoCard,
  InlineEmptyState,
  LoadingState,
  PageSection,
  ResponsiveGrid,
  StatusBadge,
} from '@/components/ui';
import { formatarData, formatarDataHora } from '@/utils/timeUtils';
import { useGehcSaude } from '@/hooks/equipamentos/useGehcSaude';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(val, unidade = '') {
  if (val === null || val === undefined) return 'N/D';
  return `${val}${unidade}`;
}

function helioCor(pct) {
  if (pct === null || pct === undefined) return 'var(--text-muted)';
  if (pct < 30) return 'var(--color-danger)';
  if (pct < 70) return 'var(--color-warning)';
  return 'var(--color-success)';
}

function StatusIcon({ ok }) {
  if (ok === null || ok === undefined) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  return ok
    ? <FontAwesomeIcon icon={faCircleCheck}  style={{ color: 'var(--color-success)' }} />
    : <FontAwesomeIcon icon={faCircleXmark}  style={{ color: 'var(--color-danger)'  }} />;
}

function HelioBar({ pct }) {
  if (pct === null || pct === undefined) return null;
  const cor = helioCor(pct);
  return (
    <div className="mt-2 w-full">
      <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
        <span>0%</span>
        <span style={{ color: cor, fontWeight: 600 }}>{pct}%</span>
        <span>100%</span>
      </div>
      <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface-soft)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: cor }}
        />
      </div>
    </div>
  );
}

function StatusCompressor({ status }) {
  if (!status) return <span style={{ color: 'var(--text-muted)' }}>N/D</span>;
  const upper = status.toUpperCase();
  const ok    = upper === 'NORMAL' || upper === 'OK' || upper === 'ON';
  const icon  = ok ? faCircleCheck : faCircleExclamation;
  const cor   = ok ? 'var(--color-success)' : 'var(--color-warning)';
  return (
    <span className="flex items-center gap-1.5 text-sm" style={{ color: cor }}>
      <FontAwesomeIcon icon={icon} />
      {status}
    </span>
  );
}

// ─── Seção: Saúde do Magneto ──────────────────────────────────────────────────

function SecaoSaude({ saude }) {
  if (!saude) {
    return (
      <InlineEmptyState message="Nenhum snapshot de saúde sincronizado ainda. Execute o monitoramento para obter dados." />
    );
  }

  return (
    <div className="space-y-4">
      <ResponsiveGrid cols={{ base: 1, md: 2, xl: 4 }}>
        <InfoCard
          icon={faGaugeHigh}
          label="Nível de hélio"
          value={
            <div>
              <span style={{ color: helioCor(saude.heliumLevelPct), fontWeight: 700, fontSize: '1.25rem' }}>
                {fmt(saude.heliumLevelPct, '%')}
              </span>
              <HelioBar pct={saude.heliumLevelPct} />
            </div>
          }
        />
        <InfoCard
          icon={faWaveSquare}
          label="Pressão de hélio"
          value={fmt(saude.heliumPressurePsi, ' PSI')}
        />
        <InfoCard
          icon={faThermometerHalf}
          label="Temperatura"
          value={fmt(saude.coolantTempC, ' °C')}
        />
        <InfoCard
          icon={faSnowflake}
          label="Fluxo resfriador"
          value={fmt(saude.coolantFlowGpm, ' GPM')}
        />
      </ResponsiveGrid>

      <ResponsiveGrid cols={{ base: 1, md: 3 }}>
        <InfoCard
          icon={faWrench}
          label="Compressor"
          value={<StatusCompressor status={saude.compressorStatus} />}
        />
        <InfoCard
          icon={faSnowflake}
          label="Cryo-cooler"
          value={<StatusCompressor status={saude.cryocoolerStatus} />}
        />
        <InfoCard
          icon={faWifi}
          label="Conectividade"
          value={
            <span className="flex items-center gap-1.5">
              <StatusIcon ok={saude.equipmentOnline} />
              <span style={{ color: saude.equipmentOnline ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {saude.equipmentOnline === true ? 'Online' : saude.equipmentOnline === false ? 'Offline' : 'N/D'}
              </span>
            </span>
          }
        />
      </ResponsiveGrid>

      {saude.capturedAt && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Capturado em: {formatarDataHora(saude.capturedAt)}
        </p>
      )}
    </div>
  );
}

// ─── Seção: Contrato GE ───────────────────────────────────────────────────────

function SecaoContrato({ contrato }) {
  if (!contrato) {
    return <InlineEmptyState message="Contrato ainda não sincronizado." />;
  }

  const entitlements = (() => {
    try { return JSON.parse(contrato.entitlements ?? '[]'); } catch { return []; }
  })();

  return (
    <div className="space-y-4">
      <ResponsiveGrid cols={{ base: 1, md: 2, xl: 4 }}>
        <InfoCard icon={faFileContract} label="Contrato" value={contrato.contractName || 'N/D'} />
        <InfoCard
          icon={faFileContract}
          label="Status"
          value={contrato.contractStatus ? <StatusBadge value={contrato.contractStatus} /> : 'N/D'}
        />
        <InfoCard icon={faFileContract} label="Início" value={formatarData(contrato.contractStart)} />
        <InfoCard icon={faFileContract} label="Vencimento" value={formatarData(contrato.contractExpiration)} />
      </ResponsiveGrid>

      <ResponsiveGrid cols={{ base: 1, md: 2, xl: 3 }}>
        <InfoCard icon={faFileContract} label="Garantia" value={contrato.warrantyStatus || 'N/D'} />
        <InfoCard icon={faFileContract} label="Garantia até" value={formatarData(contrato.warrantyExpiration)} />
        <InfoCard icon={faFileContract} label="Tipo de cobertura" value={contrato.assetCoverageType || 'N/D'} />
      </ResponsiveGrid>

      {entitlements.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Entitlements incluídos
          </p>
          <div className="flex flex-wrap gap-2">
            {entitlements.map((e, i) => (
              <span
                key={i}
                className="rounded-full px-3 py-1 text-xs"
                style={{ backgroundColor: 'var(--brand-primary-soft)', color: 'var(--brand-primary)' }}
              >
                {e.contractEntitlementDescription || e.contractEntitlement}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Seção: Últimas OS ────────────────────────────────────────────────────────

function SecaoOS({ ordens }) {
  if (!ordens?.length) {
    return <InlineEmptyState message="Nenhuma OS importada ainda." />;
  }

  return (
    <div className="space-y-3">
      {ordens.map((os) => (
        <div
          key={os.gehcServiceId}
          className="rounded-2xl border px-4 py-4"
          style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-soft)' }}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {os.problemDescription || 'Sem descrição'}
              </p>
              {os.engineerName && (
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Engenheiro: {os.engineerName}
                </p>
              )}
            </div>
            {os.serviceStateCode && <StatusBadge value={os.serviceStateCode} />}
          </div>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            {os.trackingNumber && <span>OS: {os.trackingNumber}</span>}
            {os.serviceTypeCode && <span>Tipo: {os.serviceTypeCode}</span>}
            {os.requestedAt && <span>Solicitada: {formatarData(os.requestedAt)}</span>}
            {os.scheduledDate && <span>Agendada: {formatarData(os.scheduledDate)}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Seção: Utilização Mensal ─────────────────────────────────────────────────

function SecaoUtilizacao({ utilizacao }) {
  if (!utilizacao?.length) {
    return <InlineEmptyState message="Dados de utilização ainda não sincronizados." />;
  }

  return (
    <div className="space-y-2">
      <div
        className="hidden grid-cols-5 gap-2 px-4 py-2 text-xs font-semibold md:grid"
        style={{ color: 'var(--text-muted)' }}
      >
        <span>Mês</span>
        <span className="text-right">Pacientes</span>
        <span className="text-right">Exames</span>
        <span className="text-right">Duração média</span>
        <span className="text-right">Uptime</span>
      </div>

      {utilizacao.map((m) => (
        <div
          key={m.mesReferencia}
          className="rounded-2xl border px-4 py-3"
          style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-soft)' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 md:grid md:grid-cols-5">
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {new Date(m.mesReferencia).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
            </span>
            <span className="text-right text-sm" style={{ color: 'var(--text-secondary)' }}>
              {m.pacientesTotal ?? '—'}
            </span>
            <span className="text-right text-sm" style={{ color: 'var(--text-secondary)' }}>
              {m.examesTotal ?? '—'}
            </span>
            <span className="text-right text-sm" style={{ color: 'var(--text-secondary)' }}>
              {m.duracaoMediaMin != null ? `${m.duracaoMediaMin} min` : '—'}
            </span>
            <span
              className="text-right text-sm font-semibold"
              style={{ color: m.uptimeContrato >= 95 ? 'var(--color-success)' : m.uptimeContrato >= 80 ? 'var(--color-warning)' : 'var(--color-danger)' }}
            >
              {m.uptimeContrato != null ? `${m.uptimeContrato}%` : '—'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

function TabSaudeGehc({ equipamentoId, equipamento }) {
  // Hook precisa ser chamado sempre (rules-of-hooks). Quando o equipamento
  // nao tem gehcAssetId, o hook ainda dispara mas a UI mostra estado vazio
  // amigavel antes de qualquer outro retorno.
  const { resumo, loading, error } = useGehcSaude(equipamentoId);

  // Equipamento sem vinculo GE — comum em equipamentos GE recem-cadastrados
  // antes do discovery cross-ref casar pelo numero de serie.
  if (!equipamento?.gehcAssetId) {
    return (
      <div
        className="flex items-start gap-3 rounded-2xl border px-4 py-4"
        style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-soft)' }}
      >
        <FontAwesomeIcon
          icon={faCircleExclamation}
          className="mt-0.5 shrink-0"
          style={{ color: 'var(--color-warning)' }}
        />
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Monitoramento GE Health Cloud não ativo
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Este equipamento ainda não foi vinculado ao portal GE. O monitoramento de hélio, pressão, fluxo e compressor depende dessa integração.
          </p>
          <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            A vinculação acontece automaticamente quando o número de série bate com o cadastro GE. Se o equipamento já estiver no portal, confira a tag e número de série na aba Visão Geral.
          </p>
        </div>
      </div>
    );
  }

  if (loading) return <LoadingState message="Carregando dados GE Health Cloud..." />;

  if (error && !resumo) {
    return (
      <div
        className="flex items-start gap-3 rounded-2xl border px-4 py-4"
        style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-soft)' }}
      >
        <FontAwesomeIcon
          icon={faCircleExclamation}
          className="mt-0.5 shrink-0"
          style={{ color: 'var(--color-warning)' }}
        />
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Dados GE não disponíveis
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageSection
        title="Saúde do magneto"
        description="Dados em tempo real capturados do portal GE Health Cloud — nível de hélio, pressão, temperatura e status do compressor."
      >
        <SecaoSaude saude={resumo?.saude} />
      </PageSection>

      <PageSection
        title="Contrato GE"
        description="Cobertura contratual vigente conforme cadastro no portal MyEquipment 360."
      >
        <SecaoContrato contrato={resumo?.contrato} />
      </PageSection>

      <PageSection
        title="Histórico de OS"
        description="Últimas ordens de serviço abertas pela GE Healthcare para este equipamento."
      >
        <SecaoOS ordens={resumo?.ultimasOS} />
      </PageSection>

      <PageSection
        title="Utilização mensal"
        description="Pacientes, exames e uptime por mês, importados do portal GE."
      >
        <SecaoUtilizacao utilizacao={resumo?.utilizacao} />
      </PageSection>
    </div>
  );
}

TabSaudeGehc.propTypes = {
  equipamentoId: PropTypes.string.isRequired,
  equipamento: PropTypes.object.isRequired,
};

export default TabSaudeGehc;
