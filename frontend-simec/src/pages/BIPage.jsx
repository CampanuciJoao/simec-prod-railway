import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartBar, faPrint, faSpinner, faTools, faExclamationTriangle, faClock } from '@fortawesome/free-solid-svg-icons';
import { exportarBIPDF } from '../utils/pdfUtils';

function BIPage() {
    const [dados, setDados] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/bi/indicadores').then(res => {
            setDados(res.data);
            setLoading(false);
        });
    }, []);

    if (loading) return <div className="page-content-wrapper centered-loader"><FontAwesomeIcon icon={faSpinner} spin size="3x"/></div>;

    return (
        <div className="page-content-wrapper">
            <div className="page-title-card">
                <h1 className="page-title-internal">Business Intelligence - {dados.ano}</h1>
                <button className="btn btn-primary" onClick={() => exportarBIPDF(dados)}>
                    <FontAwesomeIcon icon={faPrint} /> Imprimir Relatório BI
                </button>
            </div>

            <div className="summary-cards">
                <div className="card" style={{borderLeft: '8px solid #22c55e'}}>
                    <div className="card-text-content">
                        <div className="card-title">Preventivas Anuais</div>
                        <div className="card-value" style={{color: '#22c55e'}}>{dados.resumo.totalPreventivas}</div>
                    </div>
                </div>
                <div className="card" style={{borderLeft: '8px solid #ef4444'}}>
                    <div className="card-text-content">
                        <div className="card-title">Corretivas Anuais</div>
                        <div className="card-value" style={{color: '#ef4444'}}>{dados.resumo.totalCorretivas}</div>
                    </div>
                </div>
            </div>

            <section className="page-section">
                <h3><FontAwesomeIcon icon={faClock} /> Ranking de Downtime (Tempo de Parada)</h3>
                <div className="table-responsive-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Equipamento</th>
                                <th>Unidade</th>
                                <th className="text-center">Total de Horas Parado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {dados.rankingDowntime.map(item => (
                                <tr key={item.tag}>
                                    <td>{item.modelo} <br/><small>{item.tag}</small></td>
                                    <td>{item.unidade}</td>
                                    <td className="text-center" style={{fontWeight: 'bold', color: '#ef4444'}}>{item.horasParado}h</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}

export default BIPage;