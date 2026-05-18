import React, { useState, useEffect, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFilePdf, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

import { Button, Card, DateInput, InlineEmptyState, LoadingState } from '@/components/ui';
import { getGehcHistoricoGrafico, getGehcHistorico } from '@/services/api/gehcApi';
import { exportarSaudeEquipamentoPDF } from '@/services/api/pdfApi';
import { formatarDataHora } from '@/utils/timeUtils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const PRESETS = [
  { label: '7d',  days: 7   },
  { label: '30d', days: 30  },
  { label: '90d', days: 90  },
  { label: '6m',  days: 180 },
  { label: '1a',  days: 365 },
  { label: '2a',  days: 730 },
];

function dateFromDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

const BASE_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { maxTicksLimit: 10, maxRotation: 0 }, grid: { color: 'rgba(0,0,0,0.05)' } },
    y: { grid: { color: 'rgba(0,0,0,0.05)' } },
  },
};

function GraficoLinha({ dados, label, cor, unidade, yMin, yMax }) {
  if (!dados?.length) {
    return <InlineEmptyState message="Sem dados no periodo selecionado." />;
  }

  const labels = dados.map(d =>
    new Date(d.bucket).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  );

  const options = {
    ...BASE_CHART_OPTIONS,
    scales: {
      ...BASE_CHART_OPTIONS.scales,
      y: {
        ...BASE_CHART_OPTIONS.scales.y,
        ...(yMin !== undefined && { min: yMin }),
        ...(yMax !== undefined && { max: yMax }),
        ticks: { callback: v => `${v}${unidade}` },
      },
    },
    plugins: {
      ...BASE_CHART_OPTIONS.plugins,
      tooltip: {
        callbacks: { label: ctx => `${label}: ${ctx.parsed.y}${unidade}` },
      },
    },
  };

  return (
    <div style={{ height: 220 }}>
      <Line
        data={{
          labels,
          datasets: [{
            label,
            data: dados.map(d => d.avg),
            borderColor: cor,
            backgroundColor: cor + '22',
            fill: true,
            tension: 0.3,
            pointRadius: dados.length > 60 ? 0 : 3,
            pointHoverRadius: 5,
          }],
        }}
        options={options}
      />
    </div>
  );
}

function TabelaRegistros({ equipamentoId, inicio, fim }) {
  const [data, setData]       = useState(null);
  const [pagina, setPagina]   = useState(1);
  const [loading, setLoading] = useState(false);

  const carregar = useCallback(async (p) => {
    setLoading(true);
    try {
      const res = await getGehcHistorico(equipamentoId, { inicio, fim, pagina: p, limite: 50 });
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [equipamentoId, inicio, fim]);

  useEffect(() => { setPagina(1); carregar(1); }, [carregar]);

  const mudarPagina = (p) => { setPagina(p); carregar(p); };

  if (loading) return <LoadingState message="Carregando registros..." />;
  if (!data?.snapshots?.length) return <InlineEmptyState message="Sem registros no periodo selecionado." />;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--border-soft)' }}>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border-soft)', backgroundColor: 'var(--bg-surface-soft)' }}>
              {['Data/Hora', 'Helio %', 'Pressao PSI', 'Temp C', 'Fluxo GPM', 'Compressor', 'Online'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.snapshots.map((s, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border-soft)', backgroundColor: i % 2 === 0 ? 'var(--bg-surface-soft)' : 'transparent' }}>
                <td className="px-3 py-2 whitespace-nowrap text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {formatarDataHora(s.capturedAt)}
                </td>
                <td className="px-3 py-2 font-semibold text-xs" style={{
                  color: s.heliumLevelPct == null ? 'var(--text-muted)'
                       : s.heliumLevelPct < 30    ? 'var(--color-danger)'
                       : s.heliumLevelPct < 70    ? 'var(--color-warning)'
                       : 'var(--color-success)',
                }}>
                  {s.heliumLevelPct != null ? `${s.heliumLevelPct}%` : '—'}
                </td>
                <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }}>{s.heliumPressurePsi != null ? s.heliumPressurePsi : '—'}</td>
                <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }}>{s.coolantTempC != null ? s.coolantTempC : '—'}</td>
                <td className="px-3 py-2 text-xs" style={{ color: 'var(--text-primary)' }}>{s.coolantFlowGpm != null ? s.coolantFlowGpm : '—'}</td>
                <td className="px-3 py-2 text-xs" style={{ color: s.compressorStatus === 'ON' ? 'var(--color-success)' : s.compressorStatus ? 'var(--color-danger)' : 'var(--text-muted)' }}>
                  {s.compressorStatus || '—'}
                </td>
                <td className="px-3 py-2 text-xs" style={{ color: s.equipmentOnline === true ? 'var(--color-success)' : s.equipmentOnline === false ? 'var(--color-danger)' : 'var(--text-muted)' }}>
                  {s.equipmentOnline === true ? 'Online' : s.equipmentOnline === false ? 'Offline' : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.totalPaginas > 1 && (
        <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>{data.total} registros &middot; pagina {pagina} de {data.totalPaginas}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={pagina <= 1} onClick={() => mudarPagina(pagina - 1)}>
              <FontAwesomeIcon icon={faChevronLeft} />
            </Button>
            <Button size="sm" variant="secondary" disabled={pagina >= data.totalPaginas} onClick={() => mudarPagina(pagina + 1)}>
              <FontAwesomeIcon icon={faChevronRight} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TabHistoricoSaude({ equipamentoId }) {
  const [presetAtivo, setPresetAtivo]       = useState('30d');
  const [inicio, setInicio]                 = useState(dateFromDaysAgo(30));
  const [fim, setFim]                       = useState(todayStr());
  const [grafico, setGrafico]               = useState(null);
  const [loadingGrafico, setLoadingGrafico] = useState(false);

  const carregarGrafico = useCallback(async () => {
    setLoadingGrafico(true);
    try {
      const res = await getGehcHistoricoGrafico(equipamentoId, { inicio, fim });
      setGrafico(res);
    } catch {
      setGrafico(null);
    } finally {
      setLoadingGrafico(false);
    }
  }, [equipamentoId, inicio, fim]);

  useEffect(() => { carregarGrafico(); }, [carregarGrafico]);

  const handlePreset = (p) => {
    setPresetAtivo(p.label);
    setInicio(dateFromDaysAgo(p.days));
    setFim(todayStr());
  };

  const handleCustom = (campo, e) => {
    setPresetAtivo('custom');
    if (campo === 'inicio') setInicio(e.target.value);
    else setFim(e.target.value);
  };

  const [exportandoModo, setExportandoModo] = useState(null);

  const handleExportar = async (modo) => {
    setExportandoModo(modo);
    try {
      await exportarSaudeEquipamentoPDF(equipamentoId, { inicio, fim, modo });
    } catch {
      // erro tratado pelo helper baixarPdf
    } finally {
      setExportandoModo(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card surface="soft" className="rounded-2xl">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => handlePreset(p)}
                style={{
                  padding: '4px 14px',
                  borderRadius: '9999px',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  backgroundColor: presetAtivo === p.label ? 'var(--brand-primary)' : 'var(--bg-surface)',
                  color:           presetAtivo === p.label ? '#fff'                  : 'var(--text-secondary)',
                  border: `1px solid ${presetAtivo === p.label ? 'var(--brand-primary)' : 'var(--border-soft)'}`,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-end gap-2 ml-auto flex-wrap">
            <DateInput label="De"  value={inicio} onChange={(e) => handleCustom('inicio', e)} />
            <DateInput label="Ate" value={fim}    onChange={(e) => handleCustom('fim', e)} />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleExportar('resumido')}
              disabled={!!exportandoModo}
              title="Relatorio executivo com KPIs, eventos criticos e graficos (~2-3 paginas)"
            >
              <FontAwesomeIcon icon={faFilePdf} className="mr-2" />
              {exportandoModo === 'resumido' ? 'Gerando...' : 'PDF Resumido'}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleExportar('completo')}
              disabled={!!exportandoModo}
              title="Relatorio tecnico com resumo diario, todos os eventos e graficos"
            >
              <FontAwesomeIcon icon={faFilePdf} className="mr-2" />
              {exportandoModo === 'completo' ? 'Gerando...' : 'PDF Completo'}
            </Button>
          </div>
        </div>
      </Card>

      <div>
        <p className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Nivel de helio &mdash; media diaria (%)
        </p>
        {loadingGrafico
          ? <LoadingState message="Carregando..." />
          : <GraficoLinha dados={grafico?.helio} label="Helio" cor="#3b82f6" unidade="%" yMin={0} yMax={100} />
        }
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Pressao de helio &mdash; media a cada 6h (PSI)
        </p>
        {loadingGrafico
          ? <LoadingState message="Carregando..." />
          : <GraficoLinha dados={grafico?.pressao} label="Pressao" cor="#8b5cf6" unidade=" PSI" />
        }
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Registros detalhados
        </p>
        <TabelaRegistros equipamentoId={equipamentoId} inicio={inicio} fim={fim} />
      </div>
    </div>
  );
}

export default TabHistoricoSaude;
