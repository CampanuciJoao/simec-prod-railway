import React, { useEffect, useState } from 'react';
import { getIndicadoresBI } from '../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faSpinner, faClock, faTools, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import { exportarBIPDF } from '../utils/pdfUtils';

function BIPage() {
    const [dados, setDados] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getIndicadoresBI().then(res => { setDados(res); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    if (loading) return <div className="page-content-wrapper centered-loader"><FontAwesomeIcon icon={faSpinner} spin size="3x"/></div>;
    if (!dados) return <div className="page-content-wrapper"><p>Dados não encontrados.</p></div>;

    return (
        <div className="page-content-wrapper">
            <div className="page-title-card">
                <h1 className="page-title-internal">Business Intelligence - Performance {dados.ano}</h1>
                <button className="btn btn-primary" onClick={() => exportarBIPDF(dados)}>
                    <FontAwesomeIcon icon={faPrint} /> Imprimir Relatório BI
                </button>
            </div>

            <div className="summary-cards">
                <div className="card" style={{borderLeft: '8px solid #22c55e'}}>
                    <div className="card-text-content">
                        <div className="card-title">Preventivas Realizadas</div>
                        <div className="card-value" style={{color: '#22c55e'}}>{dados.resumo.totalPreventivas}</div>
                    </div>
                </div>
                <div className="card" style={{borderLeft: '8px solid #ef4444'}}>
                    <div className="card-text-content">
                        <div className="card-title">Corretivas (Paradas)</div>
                        <div className="card-value" style={{color: '#ef4444'}}>{dados.resumo.totalCorretivas}</div>
                    </div>
                </div>
            </div>

            <section className="page-section">
                <h3><FontAwesomeIcon icon={faClock} /> Ranking de Downtime (Tempo de Parada)</h3>
                <table className="data-table">
                    <thead>
                        <tr><th>Equipamento</th><th>Unidade</th><th className="text-center">Tempo Total Parado</th></tr>
                    </thead>
                    <tbody>
                        {dados.rankingDowntime.map((item, index) => (
                            <tr key={index}>
                                <td>{item.modelo} <br/><small style={{color: '#64748b'}}>{item.tag}</small></td>
                                <td>{item.unidade}</td>
                                <td className="text-center" style={{fontWeight: 'bold', color: '#ef4444'}}>
                                    {Math.floor(item.minutosParado / 60)}h {item.minutosParado % 60}min
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </div>
    );
}
export default BIPage;