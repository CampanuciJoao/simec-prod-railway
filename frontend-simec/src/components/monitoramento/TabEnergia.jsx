import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBatteryFull, faBatteryHalf, faBatteryQuarter, faBolt, faBoltLightning,
  faPlugCircleCheck, faPlugCircleXmark, faTemperatureHigh, faTriangleExclamation,
  faSolarPanel,
} from '@fortawesome/free-solid-svg-icons';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

import { Card, InlineEmptyState, LoadingState, Select } from '@/components/ui';
import { formatarDataHora } from '@/utils/timeUtils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

// ─── Helpers ─────────────────────────────────────────────────────────────────
const RUNNING_STATE_LABELS = {
  163: { label: 'Ligado à rede',    cor: 'var(--color-success)',  icon: faPlugCircleCheck },
  164: { label: 'Em bateria (EPS)', cor: 'var(--color-warning)',  icon: faPlugCircleXmark },
  165: { label: 'Falha',            cor: 'var(--color-danger)',   icon: faTriangleExclamation },
};

function iconeDoSoc(soc) {
  if (soc == null)  return faBatteryHalf;
  if (soc >= 60)    return faBatteryFull;
  if (soc >= 30)    return faBatteryHalf;
  return faBatteryQuarter;
}

function corDoSoc(soc) {
  if (soc == null)  return 'var(--text-muted)';
  if (soc >= 50)    return 'var(--color-success)';
  if (soc >= 30)    return 'var(--color-warning)';
  return 'var(--color-danger)';
}

function fmt(n, casas = 1) {
  if (n == null) return '—';
  const num = Number(n);
  if (!Number.isFinite(num)) return '—';
  return num.toFixed(casas);
}

// ─── Status card ─────────────────────────────────────────────────────────────
function StatusCard({ status, site }) {
  const snapshot = status?.snapshot;
  const estado = snapshot?.runningState != null
    ? RUNNING_STATE_LABELS[snapshot.runningState] || { label: `Estado ${snapshot.runningState}`, cor: 'var(--text-muted)', icon: faBolt }
    : { label: 'Sem dados', cor: 'var(--text-muted)', icon: faBolt };

  const quedaAtiva = status?.quedaAtiva;
  const minsEmQueda = quedaAtiva
    ? Math.round((Date.now() - new Date(quedaAtiva.inicioEm).getTime()) / 60000)
    : null;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start gap-5">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: estado.cor + '22', color: estado.cor }}
        >
          <FontAwesomeIcon icon={estado.icon} className="text-3xl" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Status atual
          </p>
          <p className="mt-1 text-2xl font-bold" style={{ color: estado.cor }}>
            {estado.label}
            {quedaAtiva && minsEmQueda != null ? ` · há ${minsEmQueda} min` : ''}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Última leitura: {snapshot ? formatarDataHora(snapshot.capturedAt) : '—'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {site?.unidade?.nomeSistema} · {site?.modeloInversor || 'Inversor FoxESS'}
            {site?.autonomiaHoras ? ` · Autonomia ${site.autonomiaHoras}h` : ''}
          </p>
        </div>
      </div>

      {snapshot?.currentFault && (
        <div
          className="mt-4 rounded-lg px-3 py-2 text-sm"
          style={{
            backgroundColor: 'var(--color-danger-soft)',
            color: 'var(--color-danger)',
            borderLeft: '3px solid var(--color-danger)',
          }}
        >
          <FontAwesomeIcon icon={faTriangleExclamation} className="mr-2" />
          Falha reportada: {snapshot.currentFault}
        </div>
      )}
    </Card>
  );
}
StatusCard.propTypes = { status: PropTypes.object, site: PropTypes.object };

// ─── Bateria card ────────────────────────────────────────────────────────────
function BateriaCard({ bateria, idx }) {
  const soc = bateria?.soc;
  const cor = corDoSoc(soc);

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Bateria {idx + 1}
        </p>
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          SN {bateria?.sn}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <FontAwesomeIcon icon={iconeDoSoc(soc)} className="text-3xl" style={{ color: cor }} />
        <p className="text-3xl font-bold" style={{ color: cor }}>
          {soc != null ? `${fmt(soc, 0)}%` : '—'}
        </p>
      </div>
      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: 'var(--bg-surface-subtle)' }}
      >
        <div
          className="h-full transition-all"
          style={{ width: `${soc != null ? Math.max(1, Math.min(100, soc)) : 0}%`, backgroundColor: cor }}
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div>
          <p style={{ color: 'var(--text-muted)' }}>SOH</p>
          <p className="font-semibold">{bateria?.soh != null ? `${fmt(bateria.soh, 0)}%` : '—'}</p>
        </div>
        <div>
          <p style={{ color: 'var(--text-muted)' }}>Temp</p>
          <p className="font-semibold">{bateria?.tempC != null ? `${fmt(bateria.tempC, 1)}°C` : '—'}</p>
        </div>
        <div>
          <p style={{ color: 'var(--text-muted)' }}>Potência</p>
          <p className="font-semibold">
            {bateria?.powerKw != null ? `${fmt(bateria.powerKw, 2)} kW` : '—'}
          </p>
        </div>
      </div>
    </Card>
  );
}
BateriaCard.propTypes = { bateria: PropTypes.object, idx: PropTypes.number.isRequired };

// ─── Fluxo de energia ────────────────────────────────────────────────────────
function FluxoCard({ snapshot }) {
  if (!snapshot) return null;
  const items = [
    { label: 'EPS',          value: snapshot.epsPower,            unit: 'kW', icon: faBoltLightning },
    { label: 'Carga bateria', value: snapshot.batChargePower,     unit: 'kW', icon: faSolarPanel    },
    { label: 'Descarga bat',  value: snapshot.batDischargePower,  unit: 'kW', icon: faBolt          },
    { label: 'Consumo rede',  value: snapshot.gridConsumptionPower, unit: 'kW', icon: faPlugCircleCheck },
    { label: 'Export rede',   value: snapshot.feedinPower,        unit: 'kW', icon: faBolt          },
  ];
  return (
    <Card className="p-4">
      <p className="mb-3 text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        Fluxo de energia (agora)
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {items.map((i) => (
          <div key={i.label} className="flex items-center gap-2">
            <FontAwesomeIcon icon={i.icon} style={{ color: 'var(--brand-primary)' }} />
            <div>
              <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>{i.label}</p>
              <p className="text-sm font-semibold">
                {fmt(i.value, 2)} <span style={{ color: 'var(--text-muted)' }}>{i.unit}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {(snapshot.ambientTempC != null || snapshot.inverterTempC != null) && (
        <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-3" style={{ borderColor: 'var(--border-soft)' }}>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faTemperatureHigh} style={{ color: 'var(--color-warning)' }} />
            <div>
              <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Temp. ambiente</p>
              <p className="text-sm font-semibold">{fmt(snapshot.ambientTempC, 1)}°C</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faTemperatureHigh} style={{ color: 'var(--color-warning)' }} />
            <div>
              <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Temp. inversor</p>
              <p className="text-sm font-semibold">{fmt(snapshot.inverterTempC, 1)}°C</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
FluxoCard.propTypes = { snapshot: PropTypes.object };

// ─── Gráfico SoC historico ───────────────────────────────────────────────────
function GraficoSoc({ snapshots }) {
  if (!snapshots?.length) {
    return <InlineEmptyState message="Sem leituras agregáveis no período." />;
  }
  const labels = snapshots.map((s) =>
    new Date(s.capturedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  );
  const data = {
    labels,
    datasets: [{
      label: 'SoC (%)',
      data: snapshots.map((s) => s.soc),
      borderColor: '#10b981',
      backgroundColor: '#10b98122',
      fill: true,
      tension: 0.25,
      pointRadius: snapshots.length > 60 ? 0 : 2,
      pointHoverRadius: 5,
    }],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } },
      y: { min: 0, max: 100, ticks: { callback: (v) => `${v}%` } },
    },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => `SoC: ${ctx.parsed.y}%` } },
    },
  };
  return (
    <Card className="p-4">
      <p className="mb-2 text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        SoC nos últimos 7 dias
      </p>
      <div style={{ height: 240 }}>
        <Line data={data} options={options} />
      </div>
    </Card>
  );
}
GraficoSoc.propTypes = { snapshots: PropTypes.array };

// ─── Historico de quedas ─────────────────────────────────────────────────────
function HistoricoQuedas({ quedas }) {
  if (!quedas?.length) {
    return (
      <Card className="p-5">
        <p className="mb-2 text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Histórico de quedas
        </p>
        <InlineEmptyState message="Nenhuma queda registrada ainda." />
      </Card>
    );
  }
  return (
    <Card className="p-5">
      <p className="mb-3 text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        Histórico de quedas ({quedas.length})
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ borderBottom: '1px solid var(--border-soft)' }}>
              <th className="py-2 pr-3 font-semibold" style={{ color: 'var(--text-muted)' }}>Início</th>
              <th className="py-2 pr-3 font-semibold" style={{ color: 'var(--text-muted)' }}>Fim</th>
              <th className="py-2 pr-3 font-semibold" style={{ color: 'var(--text-muted)' }}>Duração</th>
              <th className="py-2 pr-3 font-semibold" style={{ color: 'var(--text-muted)' }}>SoC inicial</th>
              <th className="py-2 pr-3 font-semibold" style={{ color: 'var(--text-muted)' }}>SoC mín.</th>
              <th className="py-2 pr-3 font-semibold" style={{ color: 'var(--text-muted)' }}>SoC final</th>
            </tr>
          </thead>
          <tbody>
            {quedas.map((q) => (
              <tr key={q.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                <td className="py-2 pr-3">{formatarDataHora(q.inicioEm)}</td>
                <td className="py-2 pr-3">{q.fimEm ? formatarDataHora(q.fimEm) : <span style={{ color: 'var(--color-warning)' }}>Em andamento</span>}</td>
                <td className="py-2 pr-3">{q.duracaoMin != null ? `${q.duracaoMin} min` : '—'}</td>
                <td className="py-2 pr-3">{q.socInicial != null ? `${fmt(q.socInicial, 0)}%` : '—'}</td>
                <td className="py-2 pr-3" style={{ color: q.socMinimo != null && q.socMinimo < 20 ? 'var(--color-danger)' : undefined }}>
                  {q.socMinimo != null ? `${fmt(q.socMinimo, 0)}%` : '—'}
                </td>
                <td className="py-2 pr-3">{q.socFinal != null ? `${fmt(q.socFinal, 0)}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
HistoricoQuedas.propTypes = { quedas: PropTypes.array };

// ─── Container da aba ────────────────────────────────────────────────────────
function TabEnergia({ painel }) {
  const {
    sites, siteSelecionadoId, setSiteSelecionadoId,
    status, historico, quedas, loadingSites, loadingPainel, erro,
  } = painel;

  if (loadingSites) return <LoadingState message="Carregando sites..." />;

  if (!sites.length) {
    return (
      <Card className="p-8 text-center">
        <FontAwesomeIcon icon={faSolarPanel} className="mb-3 text-4xl" style={{ color: 'var(--text-muted)' }} />
        <p className="text-lg font-semibold">Nenhuma usina FoxESS cadastrada</p>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          Cadastre uma unidade com FoxESS em Gerenciamento → Integrações.
        </p>
      </Card>
    );
  }

  const siteAtual = status?.site || sites.find((s) => s.id === siteSelecionadoId);

  return (
    <div className="space-y-4">
      {sites.length > 1 && (
        <div className="max-w-md">
          <Select
            label="Unidade"
            value={siteSelecionadoId || ''}
            onChange={(e) => setSiteSelecionadoId(e.target.value)}
            options={sites.map((s) => ({
              value: s.id,
              label: s.unidade?.nomeSistema ? `${s.unidade.nomeSistema} - ${s.nome}` : s.nome,
            }))}
          />
        </div>
      )}

      {erro && (
        <div
          className="rounded-lg px-3 py-2 text-sm"
          style={{ backgroundColor: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}
        >
          {erro}
        </div>
      )}

      {loadingPainel && !status ? (
        <LoadingState message="Carregando painel..." />
      ) : (
        <>
          <StatusCard status={status} site={siteAtual} />

          {status?.snapshot && (
            <FluxoCard snapshot={status.snapshot} />
          )}

          {status?.snapshot?.bateriasJson?.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {status.snapshot.bateriasJson.map((b, idx) => (
                <BateriaCard key={b.sn || idx} bateria={b} idx={idx} />
              ))}
            </div>
          )}

          <GraficoSoc snapshots={historico?.snapshots} />

          <HistoricoQuedas quedas={quedas} />
        </>
      )}
    </div>
  );
}

TabEnergia.propTypes = {
  painel: PropTypes.object.isRequired,
};

export default TabEnergia;
