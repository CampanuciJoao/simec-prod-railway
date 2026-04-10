// Ficheiro: src/pages/auditoria/AuditoriaDetalhadaPage.jsx

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuditoriaDetalhada } from '../../hooks/auditoria/useAuditoriaDetalhada';
import { formatarDataHora } from '../../utils/timeUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faArrowLeft, faScroll } from '@fortawesome/free-solid-svg-icons';

function AuditoriaDetalhadaPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { logs, loading } = useAuditoriaDetalhada('Manutenção', id);

  return (
    <div className="page-content-wrapper">
      <div className="page-title-card">
        <h1 className="page-title-internal">
          <FontAwesomeIcon icon={faScroll} /> Auditoria Detalhada da Manutenção
        </h1>

        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          <FontAwesomeIcon icon={faArrowLeft} /> Voltar
        </button>
      </div>

      <div className="data-table-container">
        <div className="table-responsive-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th className="col-text-left">Data/Hora</th>
                <th className="col-text-left">Autor</th>
                <th className="col-text-left">Ação</th>
                <th className="col-text-left">Detalhes</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="table-message">
                    <FontAwesomeIcon icon={faSpinner} spin /> Carregando...
                  </td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {formatarDataHora(log.timestamp)}
                    </td>
                    <td>{log.autor?.nome || 'Sistema'}</td>
                    <td>
                      <span className={`status-badge status-${log.acao.toLowerCase()}`}>
                        {log.acao}
                      </span>
                    </td>
                    <td
                      className="col-text-left"
                      style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                    >
                      {log.detalhes}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="table-message">
                    Nenhum registro de auditoria encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AuditoriaDetalhadaPage;