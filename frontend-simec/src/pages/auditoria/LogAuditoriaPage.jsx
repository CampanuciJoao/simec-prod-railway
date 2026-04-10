// src/pages/LogAuditoriaPage.jsx
// VERSÃO FINAL - REFATORADA COM HOOK E PAGINAÇÃO FUNCIONAL

import React from 'react';
import { useAuditoria } from '../hooks/useAuditoria';
import { formatarDataHora } from '../../utils/timeUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faFilter, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';
import DateInput from '../components/DateInput';

function LogAuditoriaPage() {
    const { 
        logs, 
        loading, 
        loadingMore,
        pagination,
        filtros, 
        setFiltros, 
        opcoesFiltro,
        carregarMaisLogs
    } = useAuditoria();

    const handleFiltroChange = (e) => {
        const { name, value } = e.target;
        setFiltros(prev => ({ ...prev, [name]: value }));
    };
    
    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setFiltros(prev => ({ ...prev, [name]: value }));
    };

    return (
        <>
            <section className="page-section">
                <h3 className="filter-title" style={{ fontSize: '1.1em', textTransform: 'none', fontWeight: '600' }}>
                    <FontAwesomeIcon icon={faFilter} /> Filtros de Auditoria
                </h3>
                <div className="relatorio-filtros-container">
                    <div className="form-group">
                        <label>Usuário</label>
                        <select name="autorId" value={filtros.autorId} onChange={handleFiltroChange}>
                            <option value="">Todos</option>
                            {opcoesFiltro.usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Ação</label>
                        <select name="acao" value={filtros.acao} onChange={handleFiltroChange}>
                            <option value="">Todas</option>
                            {opcoesFiltro.acoes.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Entidade</label>
                        <select name="entidade" value={filtros.entidade} onChange={handleFiltroChange}>
                            <option value="">Todas</option>
                            {opcoesFiltro.entidades.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                    </div>
                    <div className="filtro-agrupador-datas">
                        <div className="form-group">
                            <label><FontAwesomeIcon icon={faCalendarAlt} /> Data Início</label>
                            <DateInput name="dataInicio" value={filtros.dataInicio} onChange={handleDateChange} />
                        </div>
                        <div className="form-group">
                            <label><FontAwesomeIcon icon={faCalendarAlt} /> Data Fim</label>
                            <DateInput name="dataFim" value={filtros.dataFim} onChange={handleDateChange} />
                        </div>
                    </div>
                </div>
            </section>

            <section className="page-section">
                <div className="table-responsive-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Data/Hora</th>
                                <th>Usuário</th>
                                <th>Ação</th>
                                <th>Entidade (ID)</th>
                                <th>Detalhes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && logs.length === 0 ? (
                                <tr><td colSpan="5" className="table-message"><FontAwesomeIcon icon={faSpinner} spin /> Carregando logs...</td></tr>
                            ) : logs.length > 0 ? (
                                logs.map(log => (
                                    <tr key={log.id}>
                                        <td style={{whiteSpace: 'nowrap'}}>{formatarDataHora(log.timestamp)}</td>
                                        <td>{log.autor.nome}</td>
                                        <td><span className={`status-badge status-${log.acao.toLowerCase().replace(/_/g, '-')}`}>{log.acao}</span></td>
                                        <td>{log.entidade} {log.entidadeId ? <span style={{ opacity: 0.6 }}>({log.entidadeId.substring(0, 8)}...)</span> : ''}</td>
                                        <td style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{log.detalhes}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="5" className="table-message">Nenhum registro encontrado para os filtros selecionados.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {pagination.hasNextPage && (
                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                        <button className="btn btn-primary" onClick={carregarMaisLogs} disabled={loadingMore}>
                            {loadingMore ? <><FontAwesomeIcon icon={faSpinner} spin /> Carregando...</> : 'Carregar Mais'}
                        </button>
                    </div>
                )}
            </section>
        </>
    );
}

export default LogAuditoriaPage;