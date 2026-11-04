// Aba Energia do painel /monitoramento. Suporta N plantas por tenant,
// cada planta com N inverters (multi-provider). Dados em tempo real
// atualizam a cada 30s pelo hook useSolarPainel.

import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBatteryFull, faBatteryHalf, faBatteryQuarter, faBolt, faBoltLightning,
  faPlugCircleCheck, faPlugCircleXmark, faTemperatureHigh, faTriangleExclamation,
  faSolarPanel, faMicrochip,
} from '@fortawesome/free-solid-svg-icons';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

import { Card, InlineEmptyState, LoadingState, SelectMenu } from '@/components/ui';
import { formatarDataHora } from '@/utils/timeUtils';
import { useSolarPainel } from '@/hooks/monitoramento/useSolarPainel';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const RUNNING_STATE_LABELS = {
  163: { label: 'Ligado à rede',    cor: 'var(--color-success)',  icon: faPlugCircleCheck },
  164: { label: 'Em bateria (EPS)', cor: 'var(--color-warning)',  icon: faPlugCircleXmark },
  165: { label: 'Falha',            cor: 'var(--color-danger)',   icon: faTriangleExclamation },
};

const PROVIDER_LABELS = {
  foxess: 'FoxESS',
  growatt: 'Growatt',
  sungrow: 'Sungrow',
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

function compor(status) {
  if (!status) return null;
  const snaps = (status.snapshotsPorInverter || []).map((x) => x.snapshot).filter(Boolean);
  if (snaps.length === 0) return null;

  const comSoc = snaps.find((s) => s.soc != null);
  const comRunning = snaps.find((s) => s.runningState != null);

  const soma = (campo) => {
    let total = 0; let houve = false;
    for (const s of snaps) {
      if (s[campo] != null) { total += s[campo]; houve = true; }
    }
    return houve ? total : null;
  };

  const ultimo = snaps.reduce((a, b) =>
    new Date(a.capturedAt) > new Date(b.capturedAt) ? a : b
  );

  return {
    capturedAt: ultimo.capturedAt,
    soc: comSoc?.soc ?? null,
    runningState: comRunning?.runningState ?? null,
    currentFault: snaps.find((s) => s.currentFault)?.currentFault || null,
    batChargePower: soma('batChargePower'),
    batDischargePower: soma('batDischargePower'),
    feedinPower: soma('feedinPower'),
    gridConsumptionPower: soma('gridConsumptionPower'),
    epsPower: soma('epsPower'),
    powerKw: soma('powerKw'),
    generationKwhDay: soma('generationKwhDay'),
    ambientTempC: snaps.find((s) => s.ambientTempC != null)?.ambientTempC ?? null,
    inverterTempC: snaps.find((s) => s.inverterTempC != null)?.inverterTempC ?? null,
    detalhesJson: snaps.flatMap((s) => (s.detalhesJson || [])),
  };
}

function StatusCard({ plant, composto, quedaAtiva, inverters = [], snapshotsPorInverter = [] }) {
  const estado = composto?.runningState != null
    ? RUNNING_STATE_LABELS[composto.runningState] || { label: `Estado ${composto.runningState}`, cor: 'var(--text-muted)', icon: faBolt }
    : plant?.temBateria
      ? { label: 'Sem dados', cor: 'var(--text-muted)', icon: faBolt }
      : { label: 'Gerando', cor: 'var(--color-success)', icon: faSolarPanel };

  const minsEmQueda = quedaAtiva
    ? Math.round((Date.now() - new Date(quedaAtiva.inicioEm).getTime()) / 60000)
    : null;

  const inversoresAtivos = inverters.filter((i) => i.ativo);

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start gap-5">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: estado.cor + '22', color: estado.cor }}
        >
          <FontAwesomeIcon icon={estado.icon} className="text-3xl" />
        </div>
        <div className="min-w-[200px] flex-1">
          <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Status da planta
          </p>
          <p className="mt-1 text-2xl font-bold" style={{ color: estado.cor }}>
            {estado.label}
            {quedaAtiva && minsEmQueda != null ? ` · há ${minsEmQueda} min` : ''}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Última leitura: {composto ? formatarDataHora(composto.capturedAt) : '—'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {plant?.unidade?.nomeSistema} · {plant?.localFisico || 'Na própria unidade'}
            {plant?.capacidadeKwp ? ` · ${plant.capacidadeKwp} kWp` : ''}
          </p>
        </div>

        {composto?.powerKw != null && (
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Potência agora</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-success)' }}>
              {fmt(composto.powerKw, 2)} <span className="text-sm">kW</span>
            </p>
            {composto.generationKwhDay != null && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Hoje: {fmt(composto.generationKwhDay, 1)} kWh
              </p>
            )}
          </div>
        )}
      </div>

      {composto?.currentFault && (
        <div
          className="mt-4 rounded-lg px-3 py-2 text-sm"
          style={{
            backgroundColor: 'var(--color-danger-soft)',
            color: 'var(--color-danger)',
            borderLeft: '3px solid var(--color-danger)',
          }}
        >
          <FontAwesomeIcon icon={faTriangleExclamation} className="mr-2" />
          Falha reportada: {composto.currentFault}
        </div>
      )}

      {/* Lista compacta de inversores da planta (integrada no mesmo card) */}
      {inversoresAtivos.length > 0 && (
        <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--border-soft)' }}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Inversor{inversoresAtivos.length > 1 ? 'es' : ''} ({inversoresAtivos.length})
          </p>
          <div className="space-y-2">
            {inversoresAtivos.map((inv) => {
              const snap = snapshotsPorInverter.find((x) => x.inverterId === inv.id)?.snapshot;
              return (
                <div
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg px-3 py-2"
                  style={{ backgroundColor: 'var(--bg-surface-subtle)' }}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FontAwesomeIcon icon={faMicrochip} style={{ color: 'var(--brand-primary)' }} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {PROVIDER_LABELS[inv.provider] || inv.provider}
                        {inv.modeloInversor ? ` · ${inv.modeloInversor}` : ''}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>SN {inv.inverterSn}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-4 text-xs">
                    <div>
                      <p style={{ color: 'var(--text-muted)' }}>Potência</p>
                      <p className="font-semibold">{snap?.powerKw != null ? `${fmt(snap.powerKw, 2)} kW` : '—'}</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--text-muted)' }}>Hoje</p>
                      <p className="font-semibold">{snap?.generationKwhDay != null ? `${fmt(snap.generationKwhDay, 1)} kWh` : '—'}</p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--text-muted)' }}>Temp</p>
                      <p className="font-semibold">{snap?.inverterTempC != null ? `${fmt(snap.inverterTempC, 1)}°C` : '—'}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
StatusCard.propTypes = { plant: PropTypes.object, composto: PropTypes.object, quedaAtiva: PropTypes.object, inverters: PropTypes.array, snapshotsPorInverter: PropTypes.array };

function BateriaCard({ bateria, idx }) {
  const soc = bateria?.soc;
  const cor = corDoSoc(soc);
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Bateria {idx + 1}
        </p>
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
          <p className="font-semibold">{bateria?.powerKw != null ? `${fmt(bateria.powerKw, 2)} kW` : '—'}</p>
        </div>
      </div>
    </Card>
  );
}
BateriaCard.propTypes = { bateria: PropTypes.object, idx: PropTypes.number.isRequired };

function FluxoCard({ composto }) {
  if (!composto) return null;
  const items = [
    { label: 'EPS',           value: composto.epsPower,             unit: 'kW', icon: faBoltLightning },
    { label: 'Carga bat',     value: composto.batChargePower,       unit: 'kW', icon: faSolarPanel },
    { label: 'Descarga bat',  value: composto.batDischargePower,    unit: 'kW', icon: faBolt },
    { label: 'Consumo rede',  value: composto.gridConsumptionPower, unit: 'kW', icon: faPlugCircleCheck },
    { label: 'Export rede',   value: composto.feedinPower,          unit: 'kW', icon: faBolt },
  ].filter((i) => i.value != null);
  if (items.length === 0 && composto.ambientTempC == null && composto.inverterTempC == null) return null;
  return (
    <Card className="p-4">
      <p className="mb-3 text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        Fluxo de energia (agora)
      </p>
      {items.length > 0 && (
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
      )}
      {(composto.ambientTempC != null || composto.inverterTempC != null) && (
        <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-3" style={{ borderColor: 'var(--border-soft)' }}>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faTemperatureHigh} style={{ color: 'var(--color-warning)' }} />
            <div>
              <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Temp ambiente</p>
              <p className="text-sm font-semibold">{fmt(composto.ambientTempC, 1)}°C</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faTemperatureHigh} style={{ color: 'var(--color-warning)' }} />
            <div>
              <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Temp inversor</p>
              <p className="text-sm font-semibold">{fmt(composto.inverterTempC, 1)}°C</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
FluxoCard.propTypes = { composto: PropTypes.object };

function GraficoSoc({ snapshots, plant }) {
  if (!snapshots?.length) return <InlineEmptyState message="Sem leituras agregáveis no período." />;
  const campo = plant?.temBateria ? 'soc' : 'powerKw';
  const unidade = plant?.temBateria ? '%' : ' kW';
  const label = plant?.temBateria ? 'SoC (%)' : 'Potência (kW)';
  const titulo = plant?.temBateria ? 'SoC nos últimos 7 dias' : 'Geração nos últimos 7 dias';
  const labels = snapshots.map((s) =>
    new Date(s.capturedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  );
  const dados = snapshots.map((s) => s[campo]);
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 } },
      y: {
        ...(plant?.temBateria ? { min: 0, max: 100 } : {}),
        ticks: { callback: (v) => `${v}${unidade}` },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx) => `${label}: ${ctx.parsed.y}${unidade}` } },
    },
  };
  return (
    <Card className="p-4">
      <p className="mb-2 text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{titulo}</p>
      <div style={{ height: 240 }}>
        <Line
          data={{
            labels,
            datasets: [{
              label, data: dados,
              borderColor: plant?.temBateria ? '#10b981' : '#f59e0b',
              backgroundColor: (plant?.temBateria ? '#10b981' : '#f59e0b') + '22',
              fill: true, tension: 0.25,
              pointRadius: snapshots.length > 60 ? 0 : 2, pointHoverRadius: 5,
            }],
          }}
          options={options}
        />
      </div>
    </Card>
  );
}
GraficoSoc.propTypes = { snapshots: PropTypes.array, plant: PropTypes.object };

function HistoricoQuedas({ quedas }) {
  if (!quedas?.length) {
    return (
      <Card className="p-5">
        <p className="mb-2 text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Histórico de quedas</p>
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
              <th className="py-2 pr-3 font-semibold" style={{ color: 'var(--text-muted)' }}>SoC mín</th>
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

function TabEnergia() {
  const painel = useSolarPainel();
  const { plants, plantSelecionadaId, setPlantSelecionadaId, status, historico, quedas, loadingPlants, loadingPainel, erro } = painel;

  if (loadingPlants) return <LoadingState message="Carregando plantas solares..." />;

  if (!plants.length) {
    return (
      <Card className="p-8 text-center">
        <FontAwesomeIcon icon={faSolarPanel} className="mb-3 text-4xl" style={{ color: 'var(--text-muted)' }} />
        <p className="text-lg font-semibold">Nenhuma planta solar cadastrada</p>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          Cadastre uma planta em Gerenciamento → Integrações → Energia Solar.
        </p>
      </Card>
    );
  }

  const plant = status?.plant || plants.find((p) => p.id === plantSelecionadaId);
  const composto = compor(status);
  const inverters = status?.plant?.inverters || [];
  const snapshotsPorInverter = status?.snapshotsPorInverter || [];
  const bateriasInfo = (composto?.detalhesJson || []).filter((d) => d.tipo === 'bateria' || d.soc != null);

  return (
    <div className="space-y-4">
      {plants.length > 1 && (
        <div className="max-w-md">
          <SelectMenu
            label="Planta solar"
            value={plantSelecionadaId || ''}
            onChange={(v) => setPlantSelecionadaId(v)}
            options={plants.map((p) => ({
              value: p.id,
              label: `${p.unidade?.nomeSistema || ''} - ${p.nome}`,
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
          <StatusCard
            plant={plant}
            composto={composto}
            quedaAtiva={status?.quedaAtiva}
            inverters={inverters}
            snapshotsPorInverter={snapshotsPorInverter}
          />
          {composto && <FluxoCard composto={composto} />}
          {plant?.temBateria && bateriasInfo.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {bateriasInfo.map((b, idx) => <BateriaCard key={idx} bateria={b} idx={idx} />)}
            </div>
          )}
          <GraficoSoc snapshots={historico?.snapshots} plant={plant} />
          <HistoricoQuedas quedas={quedas} />
        </>
      )}
    </div>
  );
}

export default TabEnergia;
