// Ficheiro: src/pages/BIPage.jsx
// VERSÃO RESTAURADA - VISUAL ORIGINAL COM DRILL-DOWN E ALINHAMENTO CORRIGIDO
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIndicadoresBI } from '../../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPrint, 
    faSpinner, 
    faClock, 
    faExclamationTriangle, 
    faHospital, 
    faChartBar,
    faExternalLinkAlt 
} from '@fortawesome/free-solid-svg-icons';
import { exportarBIPDF } from '../../utils/pdfUtils';
import BarChart from '../../components/charts/BarChart';

function BIPage() {
    const [dados, setDados] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        getIndicadoresBI()
            .then(res => {
                setDados(res);
                setLoading(false);
            })
            .catch(err => {
                console.error("Erro ao carregar BI:", err);
                setLoading(false);
            });
    }, []);

    // Função Drill-down: Direciona para as corretivas do equipamento específico
    const handleDrillDown = (equipamentoId) => {
        navigate('/manutencoes', { 
            state: { 
                filtroEquipamentoId: equipamentoId, 
                filtroTipoInicial: 'Corretiva' 
            } 
        });
    };

    if (loading) return <div className="page-content-wrapper centered-loader"><FontAwesomeIcon icon={faSpinner} spin size="2x"/></div>;
    if (!dados) return <div className="page-content-wrapper"><p className="no-data-message">Dados de BI não disponíveis para o período.</p></div>;

    const chartUnidades = {
        labels: dados.rankingUnidades?.map(u => u.nome) || [],
        datasets: [{ 
            label: 'Horas Totais Parado', 
            data: dados.rankingUnidades?.map(u => u.horasParado) || [], 
            backgroundColor: 'rgba(59, 130, 246, 0.8)', 
            borderColor: '#2563eb',
            borderWidth: 1
        }]
    };

    return (
        <div className="page-content-wrapper">
            <div className="page-title-card">
                <h1 className="page-title-internal">
                    <FontAwesomeIcon icon={faChartBar} /> Business Intelligence - {dados.ano}
                </h1>
                <button className="btn btn-primary" onClick={() => exportarBIPDF(dados)}>
                    <FontAwesomeIcon icon={faPrint} /> Imprimir Relatório Executivo
                </button>
            </div>

            {/* CARDS DE RESUMO ORIGINAIS */}
            <div className="summary-cards">
                <div className="card" style={{ borderLeft: '6px solid #6366f1' }}>
                    <div className="card-text-content">
                        <div className="card-title">Ativos no Sistema</div>
                        <div className="card-value">{dados.resumoGeral?.totalAtivos || 0}</div>
                    </div>
                </div>
                <div className="card" style={{ borderLeft: '6px solid #22c55e' }}>
                    <div className="card-text-content">
                        <div className="card-title">Preventivas Realizadas</div>
                        <div className="card-value" style={{ color: '#22c55e' }}>{dados.resumoGeral?.preventivas || 0}</div>
                    </div>
                </div>
                <div className="card" style={{ borderLeft: '6px solid #ef4444' }}>
                    <div className="card-text-content">
                        <div className="card-title">Corretivas (Falhas)</div>
                        <div className="card-value" style={{ color: '#ef4444' }}>{dados.resumoGeral?.corretivas || 0}</div>
                    </div>
                </div>
            </div>

            <div className="detailed-sections" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                
                <section className="page-section">
                    <h3><FontAwesomeIcon icon={faHospital} /> Downtime por Unidade (Horas)</h3>
                    <div style={{ height: '280px', marginTop: '15px' }}>
                        <BarChart chartData={chartUnidades} />
                    </div>
                </section>

                <section className="page-section">
                    <h3><FontAwesomeIcon icon={faExclamationTriangle} /> Reincidência de Falhas</h3>
                    <div className="table-responsive-wrapper" style={{ marginTop: '15px' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Equipamento</th>
                                    <th className="text-center">Qtd. Corretivas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dados.rankingFrequencia?.length > 0 ? (
                                    dados.rankingFrequencia.map((e, index) => (
                                        <tr key={index} onClick={() => handleDrillDown(e.id)} style={{ cursor: 'pointer' }}>
                                            <td>
                                                <div style={{ fontWeight: 'bold', color: 'var(--cor-primaria-light)' }}>
                                                    {e.modelo} <FontAwesomeIcon icon={faExternalLinkAlt} size="xs" style={{opacity: 0.5, marginLeft: '5px'}}/>
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Tag: {e.tag}</div>
                                            </td>
                                            <td className="text-center">
                                                <span style={{ fontWeight: 'bold', color: '#ef4444', fontSize: '1.1rem' }}>{e.corretivas}</span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="2" className="text-center">Sem dados de corretivas.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* TABELA DE DOWNTIME COM ALINHAMENTO CORRIGIDO */}
                <section className="page-section" style={{ gridColumn: '1 / -1' }}>
                    <h3><FontAwesomeIcon icon={faClock} /> Ranking de Downtime (Maior Tempo Parado)</h3>
                    <div className="table-responsive-wrapper" style={{ marginTop: '15px' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th className="text-left">Equipamento</th>
                                    <th className="text-left">Nº de Série (Tag)</th>
                                    <th className="text-left">Unidade</th>
                                    <th className="text-center">Total Parado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dados.rankingDowntime?.length > 0 ? (
                                    dados.rankingDowntime.map((e, index) => (
                                        <tr key={index}>
                                            <td className="text-left">{e.modelo}</td>
                                            <td className="text-left" style={{ fontWeight: 'bold' }}>{e.tag}</td>
                                            <td className="text-left">{e.unidade}</td>
                                            <td className="text-center">
                                                <span style={{ fontWeight: 'bold', color: '#f59e0b' }}>{e.horasParado} Horas</span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="4" className="text-center">Nenhum equipamento parado registrado.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
}

export default BIPage;