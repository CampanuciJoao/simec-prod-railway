// Ficheiro: src/pages/BIPage.jsx
// VERSÃO FINAL - PAINEL DE INDICADORES DE PERFORMANCE (BI)

import React, { useEffect, useState } from 'react';
import { getIndicadoresBI } from '../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPrint, 
    faSpinner, 
    faClock, 
    faExclamationTriangle, 
    faHospital, 
    faMicrochip, 
    faChartBar,
    faCogs,
    faTools
} from '@fortawesome/free-solid-svg-icons';
import { exportarBIPDF } from '../utils/pdfUtils';
import BarChart from '../components/BarChart';

function BIPage() {
    const [dados, setDados] = useState(null);
    const [loading, setLoading] = useState(true);

    // Busca os dados processados no servidor ao carregar a página
    useEffect(() => {
        getIndicadoresBI()
            .then(res => {
                setDados(res);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    if (loading) return <div className="page-content-wrapper centered-loader"><FontAwesomeIcon icon={faSpinner} spin size="2x"/></div>;
    if (!dados) return <div className="page-content-wrapper"><p>Não foi possível carregar os indicadores no momento.</p></div>;

    // Configuração do Gráfico de Unidades
    const chartUnidades = {
        labels: dados.rankingUnidades.map(u => u.nome),
        datasets: [{ 
            label: 'Horas Totais Parado', 
            data: dados.rankingUnidades.map(u => u.horasParado), 
            backgroundColor: 'rgba(59, 130, 246, 0.8)', // Azul
            borderColor: '#2563eb',
            borderWidth: 1
        }]
    };

    return (
        <div className="page-content-wrapper">
            {/* CABEÇALHO DA PÁGINA */}
            <div className="page-title-card">
                <h1 className="page-title-internal">
                    <FontAwesomeIcon icon={faChartBar} /> Business Intelligence - {dados.ano}
                </h1>
                <button className="btn btn-primary" onClick={() => exportarBIPDF(dados)}>
                    <FontAwesomeIcon icon={faPrint} /> Imprimir Relatório Executivo
                </button>
            </div>

            {/* SEÇÃO 1: CARDS DE RESUMO GERAL */}
            <div className="summary-cards">
                <div className="card" style={{ borderLeft: '6px solid #6366f1' }}>
                    <div className="card-text-content">
                        <div className="card-title">Ativos no Sistema</div>
                        <div className="card-value">{dados.resumoGeral.totalAtivos}</div>
                    </div>
                </div>
                <div className="card" style={{ borderLeft: '6px solid #22c55e' }}>
                    <div className="card-text-content">
                        <div className="card-title">Preventivas Realizadas</div>
                        <div className="card-value" style={{ color: '#22c55e' }}>{dados.resumoGeral.preventivas}</div>
                    </div>
                </div>
                <div className="card" style={{ borderLeft: '6px solid #ef4444' }}>
                    <div className="card-text-content">
                        <div className="card-title">Corretivas (Falhas)</div>
                        <div className="card-value" style={{ color: '#ef4444' }}>{dados.resumoGeral.corretivas}</div>
                    </div>
                </div>
            </div>

            {/* SEÇÃO 2: GRÁFICOS E TABELAS DE REINCIDÊNCIA */}
            <div className="detailed-sections" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                
                {/* GRÁFICO: DOWNTIME POR UNIDADE */}
                <section className="page-section">
                    <h3><FontAwesomeIcon icon={faHospital} /> Downtime Acumulado por Unidade (Horas)</h3>
                    <div style={{ height: '280px', marginTop: '15px' }}>
                        <BarChart chartData={chartUnidades} />
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '10px', textAlign: 'center' }}>
                        Indica qual hospital está com mais equipamentos fora de operação.
                    </p>
                </section>

                {/* TABELA: EQUIPAMENTOS QUE MAIS QUEBRAM (FREQUÊNCIA) */}
                <section className="page-section">
                    <h3><FontAwesomeIcon icon={faExclamationTriangle} /> Top 5 - Reincidência de Falhas</h3>
                    <div className="table-responsive-wrapper" style={{ marginTop: '15px' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Equipamento / Tag</th>
                                    <th className="text-center">Qtd. Corretivas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dados.rankingFrequencia.map((e, index) => (
                                    <tr key={index}>
                                        <td>
                                            <div style={{ fontWeight: 'bold' }}>{e.modelo}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Série: {e.tag}</div>
                                        </td>
                                        <td className="text-center">
                                            <span style={{ fontWeight: 'bold', color: '#ef4444', fontSize: '1.1rem' }}>
                                                {e.corretivas}x
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* TABELA: RANKING DE TEMPO PARADO (DOWNTIME TOTAL) */}
                <section className="page-section" style={{ gridColumn: '1 / -1' }}>
                    <h3><FontAwesomeIcon icon={faClock} /> Ranking de Máquinas Fora de Operação (Maior Tempo)</h3>
                    <div className="table-responsive-wrapper" style={{ marginTop: '15px' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Equipamento</th>
                                    <th>Nº de Série (Tag)</th>
                                    <th>Unidade / Local</th>
                                    <th className="text-center">Tempo Total Parado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dados.rankingDowntime.map((e, index) => (
                                    <tr key={index}>
                                        <td>{e.modelo}</td>
                                        <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{e.tag}</td>
                                        <td>{e.unidade}</td>
                                        <td className="text-center">
                                            <span style={{ fontWeight: 'bold', color: '#f59e0b', fontSize: '1rem' }}>
                                                {e.horasParado} Horas
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default BIPage;