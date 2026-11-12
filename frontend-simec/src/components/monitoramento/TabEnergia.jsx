// Aba Energia do painel /monitoramento. Suporta N plantas por tenant,
// cada planta com N inverters (multi-provider). Dados em tempo real
// atualizam a cada 30s pelo hook useSolarPainel.

import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBatteryFull, faBatteryHalf, faBatteryQuarter, faBolt, faBoltLightning,
  faPlugCircleCheck, faPlugCircleXmark, faTemperatureHigh, faTriangleExclamation,
  faSolarPanel, faMicrochip, faCoins, faChartLine, faCircleCheck,
} from '@fortawesome/free-solid-svg-icons';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Tooltip, Legend, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

import { Card, InlineEmptyState, LoadingState, SelectMenu } from '@/components/ui';
import { formatarDataHora } from '@/utils/timeUtils';
import { useSolarPainel } from '@/hooks/monitoramento/useSolarPainel';
import {
  getSolarAgregadoMesAtual, getSolarFalhas, getSolarPlantHistoricoAnual,
  baixarSolarProducaoPdf,
} from '@/services/api/solarApi';
import { useToast } from '@/hooks/useToast';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

// Mapeamento de running_state compativel com FoxESS (163/164/165) e
// Sungrow (Apendice 12.1 da doc oficial). Sungrow usa codigos
// diferentes (0 grid-connected, 8 standby, etc) — unificamos aqui.
const RUNNING_STATE_LABELS = {
  0:     { label: 'Ligado à rede',    cor: 'var(--color-success)', icon: faPlugCircleCheck },
  64:    { label: 'Ligado à rede',    cor: 'var(--color-success)', icon: faPlugCircleCheck },
  128:   { label: 'Operando (derated)', cor: 'var(--color-success)', icon: faPlugCircleCheck },
  163:   { label: 'Ligado à rede',    cor: 'var(--color-success)', icon: faPlugCircleCheck },
  164:   { label: 'Em bateria (EPS)', cor: 'var(--color-warning)', icon: faPlugCircleXmark },
  165:   { label: 'Falha',            cor: 'var(--color-danger)',  icon: faTriangleExclamation },
  256:   { label: 'Falha operacional', cor: 'var(--color-danger)',  icon: faTriangleExclamation },
  1:     { label: 'Desligado',        cor: 'var(--text-muted)',    icon: faBolt },
  2:     { label: 'Aguardando',       cor: 'var(--text-muted)',    icon: faBolt },
  4:     { label: 'Parada de emergência', cor: 'var(--color-danger)', icon: faTriangleExclamation },
  8:     { label: 'Standby',          cor: 'var(--text-muted)',    icon: faBolt },
  32:    { label: 'Iniciando',        cor: 'var(--color-warning)', icon: faBolt },
  1024:  { label: 'Modo manutenção',  cor: 'var(--color-warning)', icon: faBolt },
  2048:  { label: 'Modo forçado',     cor: 'var(--color-warning)', icon: faBolt },
  4096:  { label: 'Off-grid',         cor: 'var(--color-warning)', icon: faPlugCircleXmark },
  5120:  { label: 'Standby',          cor: 'var(--text-muted)',    icon: faBolt },
  5376:  { label: 'Parada de emergência', cor: 'var(--color-danger)', icon: faTriangleExclamation },
  5632:  { label: 'Iniciando',        cor: 'var(--color-warning)', icon: faBolt },
  21760: { label: 'Desligado por falha', cor: 'var(--color-danger)', icon: faTriangleExclamation },
  32768: { label: 'Desligado',        cor: 'var(--text-muted)',    icon: faBolt },
  33024: { label: 'Operando (derated)', cor: 'var(--color-success)', icon: faPlugCircleCheck },
  37120: { label: 'Operando (com alerta)', cor: 'var(--color-warning)', icon: faTriangleExclamation },
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
        ticks: {
          // toFixed(2) evita artefatos de float tipo "2.4000000000000004"
          callback: (v) => `${Number(v).toFixed(2)}${unidade}`,
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${label}: ${Number(ctx.parsed.y).toFixed(2)}${unidade}`,
        },
      },
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

// Card "Este mês" (Fase 3) — resumo mensal: kWh gerado, economia e comparativo
function CardEsteMes({ plantId }) {
  const [dados, setDados] = React.useState(null);
  const [carregando, setCarregando] = React.useState(true);
  useEffect(() => {
    if (!plantId) return;
    let ativo = true;
    setCarregando(true);
    getSolarAgregadoMesAtual(plantId)
      .then((d) => { if (ativo) setDados(d); })
      .catch(() => {})
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [plantId]);

  if (carregando) return null;
  const kwh = dados?.kwhGerado;
  const brl = dados?.valorEconomizadoBrl;
  const variacao = dados?.variacaoKwhMesAnterior;
  // Nome do mes vem da data CORRENTE do cliente — o backend pode responder
  // rapido com dado parcial e as vezes mandar mes anterior em caso de edge
  // (ex: deploy tocando em algum cache). O user quer ver o mes atual.
  const agora = new Date();
  const mesExibicao = dados?.mes ?? (agora.getMonth() + 1);
  const anoExibicao = dados?.ano ?? agora.getFullYear();
  const mesNome = new Date(Date.UTC(anoExibicao, mesExibicao - 1, 1))
    .toLocaleString('pt-BR', { month: 'long' });
  const corVar = variacao == null ? 'var(--text-muted)' : variacao >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
  const sinal = variacao == null ? '' : variacao >= 0 ? '+' : '';
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <FontAwesomeIcon icon={faChartLine} style={{ color: 'var(--brand-primary)' }} />
        <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Este mês ({mesNome})
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Energia gerada</p>
          <p className="mt-1 text-2xl font-bold">{kwh != null ? `${fmt(kwh, 1)} kWh` : '—'}</p>
          {variacao != null && (
            <p className="mt-1 text-xs" style={{ color: corVar }}>
              {sinal}{(variacao * 100).toFixed(1)}% vs mês anterior
            </p>
          )}
        </div>
        <div>
          <p className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Economia estimada</p>
          <p className="mt-1 text-2xl font-bold" style={{ color: 'var(--color-success)' }}>
            {brl != null ? `R$ ${brl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            <FontAwesomeIcon icon={faCoins} className="mr-1" />
            Baseada na tarifa da unidade
          </p>
        </div>
        <div>
          <p className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>Dias com geração</p>
          <p className="mt-1 text-2xl font-bold">
            {dados?.diasComGeracao != null ? dados.diasComGeracao : '—'}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            {dados?.falhasTotal != null ? `${dados.falhasTotal} falhas no mês` : ''}
          </p>
        </div>
      </div>
    </Card>
  );
}
CardEsteMes.propTypes = { plantId: PropTypes.string };

const NIVEIS_FALHA = {
  1: { label: 'Crítica', cor: 'var(--color-danger)', icon: faTriangleExclamation },
  2: { label: 'Alarme',  cor: 'var(--color-warning)', icon: faTriangleExclamation },
  3: { label: 'Aviso',   cor: 'var(--color-info)', icon: faTriangleExclamation },
  4: { label: 'Sugestão', cor: 'var(--text-muted)', icon: faTriangleExclamation },
};

// Historico anual — kWh por mes dos ultimos N meses. Usa os agregados
// gravados pelo backfill (/plants/:id/historico-anual).
function HistoricoAnual({ plantId }) {
  const { addToast } = useToast();
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [meses, setMeses] = useState(12);
  const [baixandoPdf, setBaixandoPdf] = useState(false);

  useEffect(() => {
    if (!plantId) return;
    let cancel = false;
    setCarregando(true);
    getSolarPlantHistoricoAnual(plantId, meses)
      .then((r) => { if (!cancel) setDados(r); })
      .catch(() => { if (!cancel) setDados(null); })
      .finally(() => { if (!cancel) setCarregando(false); });
    return () => { cancel = true; };
  }, [plantId, meses]);

  const baixarPdf = async () => {
    if (!dados?.periodo) return;
    setBaixandoPdf(true);
    try {
      await baixarSolarProducaoPdf(plantId, {
        dataInicio: dados.periodo.inicio,
        dataFim: dados.periodo.fim,
      });
      addToast('PDF gerado com sucesso.', 'success');
    } catch (err) {
      addToast(err?.response?.data?.error || err.message || 'Falha ao gerar PDF.', 'error');
    } finally {
      setBaixandoPdf(false);
    }
  };

  if (carregando) return <LoadingState message="Carregando histórico..." />;
  if (!dados || !dados.serie?.length) {
    return (
      <Card title={`Histórico (${meses === 24 ? '24 meses' : '12 meses'})`} icon={faChartLine}>
        <InlineEmptyState message="Sem histórico. Rode o backfill nos inversores (botão 🩺 → Backfill 2 anos na tela de integrações)." />
      </Card>
    );
  }

  const nomesMes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const labels = dados.serie.map((s) => `${nomesMes[s.mesNumero - 1]}/${String(s.ano).slice(2)}`);
  const kwhPorMes = dados.serie.map((s) => s.kwh);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Geração (kWh)',
        data: kwhPorMes,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.3)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
      },
    ],
  };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { callback: (v) => `${v.toLocaleString('pt-BR')} kWh` } },
    },
  };

  return (
    <Card title={`Histórico (${meses === 24 ? '24 meses' : '12 meses'})`} icon={faChartLine}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <div className="text-xs text-gray-500 uppercase">Total {meses}m</div>
            <div className="font-bold">{dados.totalKwh.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kWh</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase">Economia estimada</div>
            <div className="font-bold" style={{ color: 'var(--color-success)' }}>
              R$ {dados.totalEconomiaBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase">Tarifa ref.</div>
            <div className="font-bold">R$ {dados.tarifaKwh.toFixed(2)}/kWh</div>
          </div>
        </div>
        <div className="flex gap-1">
          {[12, 24].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMeses(m)}
              className="rounded border px-2 py-1 text-[10px] font-semibold"
              style={{
                borderColor: meses === m ? 'var(--brand-primary)' : 'var(--border-soft)',
                backgroundColor: meses === m ? 'var(--brand-primary)' : 'transparent',
                color: meses === m ? '#fff' : 'inherit',
              }}
            >
              {m === 24 ? '24m' : '12m'}
            </button>
          ))}
          <button
            type="button"
            onClick={baixarPdf}
            disabled={baixandoPdf}
            className="rounded border px-2 py-1 text-[10px] font-semibold disabled:opacity-50"
            style={{ borderColor: 'var(--border-soft)' }}
            title="Baixar PDF do historico"
          >
            {baixandoPdf ? 'gerando...' : '📄 PDF'}
          </button>
        </div>
      </div>
      <div style={{ height: 240 }}>
        <Line data={chartData} options={chartOptions} />
      </div>
    </Card>
  );
}
HistoricoAnual.propTypes = { plantId: PropTypes.string };

// Lista de falhas ativas + historico recente (Fase 1).
function CardFalhas({ plantId }) {
  const [falhas, setFalhas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  useEffect(() => {
    if (!plantId) return;
    let ativo = true;
    setCarregando(true);
    getSolarFalhas(plantId, { status: 'todas', limite: 30 })
      .then((d) => { if (ativo) setFalhas(d || []); })
      .catch(() => {})
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [plantId]);

  if (carregando) return null;
  const ativas = falhas.filter((f) => !f.resolvidaEm);
  const resolvidas = falhas.filter((f) => f.resolvidaEm);

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2">
        <FontAwesomeIcon icon={faTriangleExclamation} style={{ color: ativas.length > 0 ? 'var(--color-warning)' : 'var(--color-success)' }} />
        <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Falhas do inversor ({ativas.length} ativa{ativas.length !== 1 ? 's' : ''})
        </p>
      </div>
      {falhas.length === 0 ? (
        <InlineEmptyState message="Nenhuma falha registrada." />
      ) : (
        <>
          {ativas.length > 0 && (
            <div className="space-y-2 mb-3">
              {ativas.map((f) => {
                const n = NIVEIS_FALHA[f.nivel] || NIVEIS_FALHA[2];
                return (
                  <div key={f.id} className="flex items-start gap-3 rounded-lg px-3 py-2"
                       style={{ backgroundColor: 'var(--bg-surface-subtle)', borderLeft: `3px solid ${n.cor}` }}>
                    <FontAwesomeIcon icon={n.icon} style={{ color: n.cor }} className="mt-1" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{f.nome}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {n.label} · {formatarDataHora(f.reportadaEm)}
                        {f.inverter?.inverterSn ? ` · SN ${f.inverter.inverterSn}` : ''}
                      </p>
                      {f.descricao && (
                        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{f.descricao}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {resolvidas.length > 0 && (
            <details>
              <summary className="cursor-pointer text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Histórico ({resolvidas.length} resolvida{resolvidas.length !== 1 ? 's' : ''})
              </summary>
              <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
                {resolvidas.map((f) => (
                  <div key={f.id} className="flex items-center gap-2 px-3 py-1.5 text-xs rounded"
                       style={{ backgroundColor: 'var(--bg-surface-subtle)' }}>
                    <FontAwesomeIcon icon={faCircleCheck} style={{ color: 'var(--color-success)' }} />
                    <span className="flex-1 truncate">{f.nome}</span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {formatarDataHora(f.reportadaEm)} → {formatarDataHora(f.resolvidaEm)}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </Card>
  );
}
CardFalhas.propTypes = { plantId: PropTypes.string };

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
          {plant?.id && <CardEsteMes plantId={plant.id} />}
          {composto && <FluxoCard composto={composto} />}
          {plant?.temBateria && bateriasInfo.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {bateriasInfo.map((b, idx) => <BateriaCard key={idx} bateria={b} idx={idx} />)}
            </div>
          )}
          <GraficoSoc snapshots={historico?.snapshots} plant={plant} />
          {plant?.id && <HistoricoAnual plantId={plant.id} />}
          {plant?.id && <CardFalhas plantId={plant.id} />}
          <HistoricoQuedas quedas={quedas} />
        </>
      )}
    </div>
  );
}

export default TabEnergia;
