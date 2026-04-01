// Ficheiro: src/pages/DashboardPage.jsx
// VERSÃO 8.0 - ALTO CONTRASTE, CORES SÓLIDAS E LEITURA FACILITADA

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faHeartbeat, 
    faTools, 
    faFileInvoiceDollar, 
    faExclamationCircle, 
    faChartPie, 
    faChartBar 
} from '@fortawesome/free-solid-svg-icons';
import DonutChart from '../components/DonutChart';
import BarChart from '../components/BarChart';
import SkeletonCard from '../components/SkeletonCard';
import { getDashboardData } from '../services/api';

// Mapeamento para labels amigáveis
const enumToLabelMap = { 'Operante': 'Operante', 'Inoperante': 'Inoperante', 'UsoLimitado': 'Uso Limitado', 'EmManutencao': 'Em Manutenção' };
const labelToEnumMap = { 'Operante': 'Operante', 'Inoperante': 'Inoperante', 'Uso Limitado': 'UsoLimitado', 'Em Manutenção': 'EmManutencao' };

function DashboardPage({ darkMode }) {
  const [dashboardData, setDashboardData] = useState({
    equipamentosCount: 0, manutencoesCount: 0, contratosVencendoCount: 0,
    alertasRecentes: [], statusEquipamentos: { labels: [], data: [] },
    manutencoesPorTipoMes: { labels: [], datasets: [] }, 
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const carregarDados = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDashboardData();
      setDashboardData(prevData => ({ ...prevData, ...data }));
    } catch (err) {
      setError(err.message || "Erro de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  }, []); 

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const handleChartClick = (clickedLabel) => {
    const statusEnumValue = labelToEnumMap[clickedLabel];
    if (statusEnumValue) navigate('/equipamentos', { state: { filtroStatusInicial: statusEnumValue } });
  };

  const handleBarChartClick = (dados) => {
    if (dados && dados.tipo) navigate('/manutencoes', { state: { filtroTipoInicial: dados.tipo } });
  };

  const statusEquipamentosChartData = useMemo(() => {
    const statusData = dashboardData.statusEquipamentos;
    return {
      labels: (statusData?.labels || []).map(val => enumToLabelMap[val] || val),
      datasets: [{ data: statusData?.data || [] }],
      colorsLight: statusData?.colorsLight || [],
      colorsDark: statusData?.colorsDark || [],
      textColorsLight: statusData?.textColorsLight || [],
      textColorsDark: statusData?.textColorsDark || []
    }
  }, [dashboardData.statusEquipamentos]);

  const manutencoesPorTipoMesChartData = useMemo(() => {
    const manutencoesData = dashboardData.manutencoesPorTipoMes;
    const colors = ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6'];
    return {
      labels: manutencoesData?.labels || [],
      datasets: (manutencoesData?.datasets || []).map((ds, idx) => ({
        ...ds,
        backgroundColor: colors[idx % colors.length]
      })),
    }
  }, [dashboardData.manutencoesPorTipoMes]);
  
  const temDadosValidosParaDonut = statusEquipamentosChartData.labels.length > 0 && statusEquipamentosChartData.datasets[0].data.some(d => d > 0);
  const temDadosValidosParaBar = manutencoesPorTipoMesChartData.labels.length > 0 && manutencoesPorTipoMesChartData.datasets.some(ds => ds.data.some(d => d > 0));

  if (loading) {
    return (
        <div className="page-content-wrapper">
          <div className="page-title-card"><h1 className="page-title-internal">Dashboard</h1></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 px-2">
            <div className="h-32 bg-blue-600/20 rounded-2xl animate-pulse"></div>
            <div className="h-32 bg-amber-400/20 rounded-2xl animate-pulse"></div>
            <div className="h-32 bg-indigo-600/20 rounded-2xl animate-pulse"></div>
          </div>
        </div>
    );
  }

  if (error) return <div className="page-content-wrapper"><div className="page-title-card"><h1 className="page-title-internal">Dashboard</h1></div><p className="p-4 bg-red-100 text-red-700 rounded-lg shadow">Erro: {error}</p></div>;

  return (
    <div className="page-content-wrapper">
      <div className="page-title-card shadow-lg border-none bg-slate-800">
        <h1 className="page-title-internal">Dashboard Estratégico</h1>
      </div>

      {/* SEÇÃO DE CARDS COM CORES SÓLIDAS E ALTO CONTRASTE */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 px-2">
        
        {/* CARD AZUL - ATIVOS */}
        <Link to="/equipamentos" className="group no-underline">
            <div className="bg-blue-600 p-6 rounded-2xl shadow-xl hover:bg-blue-700 transition-all flex items-center gap-5 transform group-hover:-translate-y-2">
                <div className="bg-white/20 p-4 rounded-xl text-white text-3xl shrink-0">
                    <FontAwesomeIcon icon={faHeartbeat} />
                </div>
                <div>
                    <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mb-1">Ativos Totais</p>
                    <p className="text-5xl font-black text-white leading-none">{dashboardData.equipamentosCount}</p>
                </div>
            </div>
        </Link>

        {/* CARD AMARELO - MANUTENÇÕES (Texto escuro para contraste) */}
        <Link to="/manutencoes" className="group no-underline">
            <div className="bg-amber-400 p-6 rounded-2xl shadow-xl hover:bg-amber-500 transition-all flex items-center gap-5 transform group-hover:-translate-y-2">
                <div className="bg-black/10 p-4 rounded-xl text-slate-900 text-3xl shrink-0">
                    <FontAwesomeIcon icon={faTools} />
                </div>
                <div>
                    <p className="text-amber-900/70 text-[10px] font-black uppercase tracking-widest mb-1">Em Aberto</p>
                    <p className="text-5xl font-black text-slate-900 leading-none">{dashboardData.manutencoesCount}</p>
                </div>
            </div>
        </Link>

        {/* CARD INDIGO - CONTRATOS */}
        <Link to="/contratos" className="group no-underline">
            <div className="bg-indigo-600 p-6 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-5 transform group-hover:-translate-y-2">
                <div className="bg-white/20 p-4 rounded-xl text-white text-3xl shrink-0">
                    <FontAwesomeIcon icon={faFileInvoiceDollar} />
                </div>
                <div>
                    <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mb-1">Vencendo (30d)</p>
                    <p className="text-5xl font-black text-white leading-none">{dashboardData.contratosVencendoCount}</p>
                </div>
            </div>
        </Link>
      </section>

      <section className="detailed-sections">
        <div className="alerts-section page-section border-t-4 border-red-500">
          <h2 className="font-black text-slate-800 text-sm tracking-tighter mb-4 border-none uppercase">Alertas Críticos</h2>
          <div className="alerts-list">
            {(dashboardData.alertasRecentes?.length > 0) ? (
              <ul className="space-y-2">
                {dashboardData.alertasRecentes.map(alerta => (
                  <li key={alerta.id}>
                    <Link to={alerta.link || '/alertas'} className="hover:bg-slate-100 p-2 rounded-lg transition-colors flex items-center gap-3 no-underline">
                      <FontAwesomeIcon 
                        icon={faExclamationCircle} 
                        className="text-xl" 
                        style={{ color: alerta.prioridade === 'Alta' ? '#ef4444' : (alerta.prioridade === 'Media' ? '#f59e0b' : '#64748b')}} 
                      />
                      <span className="font-black text-slate-700 text-[11px] uppercase tracking-tight leading-none">{alerta.titulo}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="text-center text-slate-400 py-10 font-bold italic">Nenhum alerta pendente.</p>}
          </div>
        </div>

        <div className="charts-section page-section">
          <div className="chart-container-dashboard"> 
            <div className="flex items-center gap-2 mb-4">
              <FontAwesomeIcon icon={faChartPie} className="text-slate-400" />
              <h2 className="m-0 border-none text-slate-800 text-sm font-black uppercase tracking-tighter">Status Geral</h2>
            </div>
            <div className="chart-wrapper h-[220px]">
              {temDadosValidosParaDonut ? (
                <DonutChart key={`donut-${darkMode}`} chartData={statusEquipamentosChartData} darkMode={darkMode} onSliceClick={handleChartClick} />
              ) : (<p className="no-data-message italic text-slate-400">Sem dados.</p>)}
            </div>
          </div>
          <hr className="my-6 border-slate-100" />
          <div className="chart-container-dashboard"> 
             <div className="flex items-center gap-2 mb-4">
               <FontAwesomeIcon icon={faChartBar} className="text-slate-400" />
               <h2 className="m-0 border-none text-slate-800 text-sm font-black uppercase tracking-tighter">Manutenções Semestrais</h2>
             </div>
            <div className="chart-wrapper h-[220px]">
              {temDadosValidosParaBar ? (
                <BarChart key={`bar-${darkMode}`} chartData={manutencoesPorTipoMesChartData} darkMode={darkMode} onBarClick={handleBarChartClick} />
              ) : (<p className="no-data-message italic text-slate-400">Sem dados.</p>)}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;