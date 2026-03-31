import React, { useEffect, useState } from 'react';
import { getIndicadoresBI } from '../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faSpinner, faClock, faExclamationTriangle, faHospital, faMicrochip, faChartPie } from '@fortawesome/free-solid-svg-icons';
import { exportarBIPDF } from '../utils/pdfUtils';
import BarChart from '../components/BarChart';

function BIPage() {
    const [dados, setDados] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getIndicadoresBI().then(res => { setDados(res); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    if (loading) return <div className="page-content-wrapper centered-loader"><FontAwesomeIcon icon={faSpinner} spin size="2x"/></div>;

    const chartUnidades = {
        labels: dados.rankingUnidades.map(u => u.nome),
        datasets: [{ label: 'Horas de Parada', data: dados.rankingUnidades.map(u => u.horasParado), backgroundColor: '#3b82f6' }]
    };

    return (
        <div className="page-content-wrapper">
            <div className="page-title-card">
                <h1 className="page-title-internal">Business Intelligence - {dados.ano}</h1>
                <button className="btn btn-primary" onClick={() => exportarBIPDF(dados)}>
                    <FontAwesomeIcon icon={faPrint} /> Imprimir Relatório Executivo
                </button>
            </div>

            {/* CARDS DE RESUMO GERAL */}
            <div className="summary-cards">
                <div className="card" style={{borderLeft: '6px solid #6366f1'}}>
                    <div className="card-text-content"><div className="card-title">Total de Ativos</div><div className="card-value">{dados.resumoGeral.totalAtivos}</div></div>
                </div>
                <div className="card" style={{borderLeft: '6px solid #22c55e'}}>
                    <div className="card-text-content"><div className="card-title">Preventivas/Ano</div><div className="card-value">{dados.resumoGeral.preventivas}</div></div>
                </div>
                <div className="card" style={{borderLeft: '6px solid #ef4444'}}>
                    <div className="card-text-content"><div className="card-title">Corretivas/Ano</div><div className="card-value">{dados.resumoGeral.corretivas}</div></div>
                </div>
            </div>

            <div className="detailed-sections" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                
                {/* RANKING UNIDADES (GRÁFICO) */}
                <section className="page-section">
                    <h3><FontAwesomeIcon icon={faHospital} /> Downtime por Unidade (Horas)</h3>
                    <div style={{ height: '250px' }}>
                        <BarChart chartData={chartUnidades} />
                    </div>
                </section>

                {/* EQUIPAMENTOS QUE MAIS QUEBRAM (FREQUÊNCIA) */}
                <section className="page-section">
                    <h3><FontAwesomeIcon icon={faExclamationTriangle} /> Top 5 - Reincidência de Falhas</h3>
                    <table className="data-table">
                        <thead><tr><th>Equipamento</th><th className="text-center">Qtd. Corretivas</th></tr></thead>
                        <tbody>
                            {dados.rankingFrequencia.map((e, i) => (
                                <tr key={i}><td>{e.modelo} <br/><small>{e.tag}</small></td><td className="text-center" style={{fontWeight:'bold', color:'#ef4444'}}>{e.corretivas}x</td></tr>
                            ))}
                        </tbody>
                    </table>
                </section>

                {/* EQUIPAMENTOS QUE MAIS FICAM PARADOS (TEMPO) */}
                <section className="page-section" style={{ gridColumn: '1 / -1' }}>
                    <h3><FontAwesomeIcon icon={faClock} /> Top 5 - Maior Tempo Fora de Operação</h3>
                    <table className="data-table">
                        <thead><tr><th>Equipamento</th><th>Unidade</th><th className="text-center">Total Parado</th></tr></thead>
                        <tbody>
                            {dados.rankingDowntime.map((e, i) => (
                                <tr key={i}><td>{e.modelo} ({e.tag})</td><td>{e.unidade}</td><td className="text-center" style={{fontWeight:'bold', color:'#f59e0b'}}>{e.horasParado} Horas</td></tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            </div>
        </div>
    );
}

export default BIPage;