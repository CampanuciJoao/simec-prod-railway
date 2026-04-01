// Ficheiro: src/pages/DashboardPage.jsx
// VERSÃO 7.0 - MODERNIZADA COM TAILWIND CSS E SKELETON LOADING

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
import SkeletonCard from '../components/SkeletonCard'; // <<< NOVO: Importando o componente de carregamento
import { getDashboardData } from '../services/api';

// Mapeamento dos valores do ENUM para Labels amigáveis
const enumToLabelMap = {
  'Operante': 'Operante',
  'Inoperante': 'Inoperante',
  'UsoLimitado': 'Uso Limitado',
  'EmManutencao': 'Em Manutenção',
};

// Mapeamento dos Labels amigáveis de volta para os valores do ENUM
const labelToEnumMap = {
  'Operante': 'Operante',
  'Inoperante': 'Inoperante',
  'Uso Limitado': 'UsoLimitado',
  'Em Manutenção': 'EmManutencao',
};

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
      setError(err.message || "Ocorreu um erro ao buscar os dados do dashboard.");
    } finally {
      setLoading(false);
    }
  }, []); 

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const handleChartClick = (clickedLabel) => {
    const statusEnumValue = labelToEnumMap[clickedLabel];
    if (statusEnumValue) {
      navigate('/equipamentos', { state: { filtroStatusInicial: statusEnumValue } });
    }
  };

  const handleBarChartClick = (dados) => {
    if (dados && dados.tipo) {
      navigate('/manutencoes', { state: { filtroTipoInicial: dados.tipo } });
    }
  };

  const statusEquipamentosChartData = useMemo(() => {
    const statusData = dashboardData.statusEquipamentos;
    return {
      labels: (statusData?.labels || []).map(enumValue => enumToLabelMap[enumValue] || enumValue),
      datasets: [{ data: statusData?.data || [] }],
      colorsLight: statusData?.colorsLight || [],
      colorsDark: statusData?.colorsDark || [],
      textColorsLight: statusData?.textColorsLight || [],
      textColorsDark: statusData?.textColorsDark || []
    }
  }, [dashboardData.statusEquipamentos]);

  const manutencoesPorTipoMesChartData = useMemo(() => {
    const manutencoesData = dashboardData.manutencoesPorTipoMes;
    const colors = ['rgba(59, 130, 246, 0.8)', 'rgba(245, 159, 11, 0.8)', 'rgba(16, 185, 129, 0.8)', 'rgba(139, 92, 246, 0.8)'];
    return {
      labels: manutencoesData?.labels || [],
      datasets: (manutencoesData?.datasets || []).map((dataset, index) => ({
        ...dataset,
        backgroundColor: colors[index % colors.length]
      })),
    }
  }, [dashboardData.manutencoesPorTipoMes]);
  
  const temDadosValidosParaDonut = statusEquipamentosChartData.labels.length > 0 && statusEquipamentosChartData.datasets[0].data.some(d => d > 0);
  const temDadosValidosParaBar = manutencoesPorTipoMesChartData.labels.length > 0 && manutencoesPorTipoMesChartData.datasets.some(ds => ds.data.some(d => d > 0));

  // ==========================================================================
  // >> NOVO: ESTADO DE CARREGAMENTO COM SKELETONS (VISUAL APP SÊNIOR) <<
  // ==========================================================================
  if (loading) {
    return (
        <div className="page-content-wrapper">
          <div className="page-title-card"><h1 className="page-title-internal">Dashboard</h1></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white h-64 rounded-2xl animate-pulse"></div>
            <div className="bg-white h-64 rounded-2xl animate-pulse"></div>
          </div>
        </div>
    );
  }

  if (error) return <div className="page-content-wrapper"><div className="page-title-card"><h1 className="page-title-internal">Dashboard</h1></div><p style={{ color: 'red' }}>Erro: {error}</p></div>;

  return (
    <div className="page-content-wrapper">
      <div className="page-title-card">
        <h1 className="page-title-internal">Dashboard</h1>
      </div>

      {/* ==========================================================================
          >> SEÇÃO DE CARDS DE RESUMO (AGORA COM TAILWIND CSS) <<
          ========================================================================== */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Card: Equipamentos */}
        <Link to="/equipamentos" className="group no-underline">
            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-[10px] border-blue-500 hover:shadow-md transition-all flex items-center gap-5 transform group-hover:-translate-y-1">
                <div className="bg-blue-50 p-4 rounded-xl text-blue-600 text-2xl">
                    <FontAwesomeIcon icon={faHeartbeat} />
                </div>
                <div>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Ativos Totais</p>
                    <p className="text-3xl font-black text-gray-800 leading-none">{dashboardData.equipamentosCount}</p>
                </div>
            </div>
        </Link>

        {/* Card: Manutenções */}
        <Link to="/manutencoes" className="group no-underline">
            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-[10px] border-yellow-500 hover:shadow-md transition-all flex items-center gap-5 transform group-hover:-translate-y-1">
                <div className="bg-yellow-50 p-4 rounded-xl text-yellow-600 text-2xl">
                    <FontAwesomeIcon icon={faTools} />
                </div>
                <div>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Manutenções Pendentes</p>
                    <p className="text-3xl font-black text-gray-800 leading-none">{dashboardData.manutencoesCount}</p>
                </div>
            </div>
        </Link>

        {/* Card: Contratos */}
        <Link to="/contratos" className="group no-underline">
            <div className="bg-white p-6 rounded-2xl shadow-sm border-l-[10px] border-purple-500 hover:shadow-md transition-all flex items-center gap-5 transform group-hover:-translate-y-1">
                <div className="bg-purple-50 p-4 rounded-xl text-purple-600 text-2xl">
                    <FontAwesomeIcon icon={faFileInvoiceDollar} />
                </div>
                <div>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Contratos Vencendo</p>
                    <p className="text-3xl font-black text-gray-800 leading-none">{dashboardData.contratosVencendoCount}</p>
                </div>
            </div>
        </Link>
      </section>

      {/* SEÇÃO DETALHADA (ALERTAS E GRÁFICOS) */}
      <section className="detailed-sections">
        <div className="alerts-section page-section">
          <h2>ALERTAS RECENTES/CRÍTICOS</h2>
          <div className="alerts-list">
            {(dashboardData.alertasRecentes?.length > 0) ? (
              <ul>
                {dashboardData.alertasRecentes.map(alerta => (
                  <li key={alerta.id}>
                    <Link to={alerta.link || '/alertas'}>
                      <FontAwesomeIcon 
                        icon={faExclamationCircle} 
                        className="alert-icon" 
                        style={{ color: alerta.prioridade === 'Alta' ? '#ef4444' : (alerta.prioridade === 'Media' ? '#FACC15' : '#64748b')}} 
                      />
                      {alerta.titulo}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p style={{textAlign: 'center', color: 'var(--cor-texto-secundario-light)'}}>Nenhum alerta crítico no momento.</p>}
          </div>
        </div>

        <div className="charts-section page-section">
          <div className="chart-container-dashboard"> 
            <div style={{display: 'flex', alignItems: 'center', marginBottom: '10px'}}>
              <FontAwesomeIcon icon={faChartPie} style={{ marginRight: '8px', fontSize: '0.9em', color: 'var(--cor-texto-secundario-light)' }} />
              <h2 style={{margin: 0, borderBottom: 'none', textTransform: 'none', letterSpacing: 'normal', fontSize:'1em', color: 'var(--cor-texto-principal-light)'}}>Status dos Equipamentos</h2>
            </div>
            <div className="chart-wrapper" style={{ height: '220px', maxHeight: '220px' }}>
              {temDadosValidosParaDonut ? (
                <DonutChart key={`donut-${darkMode}`} chartData={statusEquipamentosChartData} darkMode={darkMode} onSliceClick={handleChartClick} />
              ) : (<p className="no-data-message">Dados insuficientes para o gráfico.</p>)}
            </div>
          </div>
          <hr className="chart-separator" />
          <div className="chart-container-dashboard"> 
             <div style={{display: 'flex', alignItems: 'center', marginBottom: '10px'}}>
               <FontAwesomeIcon icon={faChartBar} style={{ marginRight: '8px', fontSize: '0.9em', color: 'var(--cor-texto-secundario-light)' }} />
               <h2 style={{margin: 0, borderBottom: 'none', textTransform: 'none', letterSpacing: 'normal', fontSize:'1em', color: 'var(--cor-texto-principal-light)'}}>Manutenções nos Últimos 6 Meses</h2>
             </div>
            <div className="chart-wrapper" style={{ height: '220px', maxHeight: '220px' }}>
              {temDadosValidosParaBar ? (
                <BarChart key={`bar-${darkMode}`} chartData={manutencoesPorTipoMesChartData} darkMode={darkMode} onBarClick={handleBarChartClick} />
              ) : (<p className="no-data-message">Dados insuficientes para o gráfico.</p>)}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;