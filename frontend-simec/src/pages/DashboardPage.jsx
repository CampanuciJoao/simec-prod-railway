// Ficheiro: src/pages/DashboardPage.jsx
// VERSÃO 10.0 - DESIGN PREMIUM CLEAN (ALTO CONTRASTE E LEITURA LEVE)

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
      setError(err.message || "Erro de conexão.");
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
      colorsLight: ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'], 
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
          <div className="page-title-card bg-[#1e293b] border-none shadow-md"><h1 className="page-title-internal">Dashboard</h1></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 px-1">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        </div>
    );
  }

  if (error) return <div className="page-content-wrapper"><div className="page-title-card"><h1 className="page-title-internal">Dashboard</h1></div><p className="p-4 bg-red-50 text-red-700 rounded-lg">Erro: {error}</p></div>;

  return (
    <div className="page-content-wrapper pb-12">
      <div className="page-title-card shadow-md border-none bg-[#1e293b] mb-8">
        <h1 className="page-title-internal font-semibold">Dashboard</h1>
      </div>

      {/* SEÇÃO DE CARDS PREMIUM CLEAN */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 px-1">
        
        {/* CARD EQUIPAMENTOS */}
        <Link to="/equipamentos" className="no-underline group">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center gap-6">
                <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 text-xl border border-blue-100 shrink-0">
                    <FontAwesomeIcon icon={faHeartbeat} />
                </div>
                <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Equipamentos</span>
                    <span className="text-3xl font-bold text-slate-800 leading-none">{dashboardData.equipamentosCount}</span>
                </div>
            </div>
        </Link>

        {/* CARD MANUTENÇÕES */}
        <Link to="/manutencoes" className="no-underline group">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center gap-6">
                <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 text-xl border border-amber-100 shrink-0">
                    <FontAwesomeIcon icon={faTools} />
                </div>
                <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Em Aberto</span>
                    <span className="text-3xl font-bold text-slate-800 leading-none">{dashboardData.manutencoesCount}</span>
                </div>
            </div>
        </Link>

        {/* CARD CONTRATOS */}
        <Link to="/contratos" className="no-underline group">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center gap-6">
                <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 text-xl border border-indigo-100 shrink-0">
                    <FontAwesomeIcon icon={faFileInvoiceDollar} />
                </div>
                <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Contratos Vencendo</span>
                    <span className="text-3xl font-bold text-slate-800 leading-none">{dashboardData.contratosVencendoCount}</span>
                </div>
            </div>
        </Link>
      </section>

      {/* SEÇÃO INFERIOR CLEAN */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-1">
        
        {/* ALERTAS RECENTES */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-slate-800 font-bold text-xs uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
              <FontAwesomeIcon icon={faExclamationCircle} className="text-slate-300" />
              Alertas Críticos
          </h3>
          <div className="space-y-1">
            {(dashboardData.alertasRecentes?.length > 0) ? (
              dashboardData.alertasRecentes.map(alerta => (
                <Link key={alerta.id} to={alerta.link || '/alertas'} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-lg transition-colors no-underline">
                    <FontAwesomeIcon 
                        icon={faExclamationCircle} 
                        className={alerta.prioridade === 'Alta' ? 'text-red-500' : 'text-amber-500'} 
                    />
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{alerta.titulo}</span>
                </Link>
              ))
            ) : <p className="text-center text-slate-300 py-10 text-sm italic">Nenhum alerta no momento.</p>}
          </div>
        </div>

        {/* GRÁFICOS */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col gap-10">
          <div>
            <h3 className="text-slate-800 font-bold text-xs uppercase tracking-widest mb-6">Status dos Ativos</h3>
            <div className="h-[200px]">
              {temDadosValidosParaDonut ? (
                <DonutChart key={`donut-${darkMode}`} chartData={statusEquipamentosChartData} darkMode={darkMode} onSliceClick={handleChartClick} />
              ) : <p className="text-center text-slate-300 py-10 text-sm">Sem dados disponíveis.</p>}
            </div>
          </div>

          <div className="border-t border-slate-50 pt-8">
            <h3 className="text-slate-800 font-bold text-xs uppercase tracking-widest mb-6">Manutenções Semestrais</h3>
            <div className="h-[200px]">
              {temDadosValidosParaBar ? (
                <BarChart key={`bar-${darkMode}`} chartData={manutencoesPorTipoMesChartData} darkMode={darkMode} onBarClick={handleBarChartClick} />
              ) : <p className="text-center text-slate-300 py-10 text-sm">Sem dados disponíveis.</p>}
            </div>
          </div>
        </div>

      </section>
    </div>
  );
}

export default DashboardPage;