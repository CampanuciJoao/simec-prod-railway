import React from 'react';
import { formatarData } from '../../utils/timeUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEdit,
  faTrashAlt,
  faEye,
  faExclamationTriangle,
  faBuilding,
  faShieldAlt,
  faPlus,
} from '@fortawesome/free-solid-svg-icons';

import { useSegurosPage } from '../../hooks/seguros/useSegurosPage';

import GlobalFilterBar from '../../components/ui/GlobalFilterBar';
import ModalConfirmacao from '../../components/ui/ModalConfirmacao';
import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import PageSection from '../../components/ui/PageSection';
import PageState from '../../components/ui/PageState';

const getDynamicStatus = (seguro) => {
  if (seguro.status !== 'Ativo') return seguro.status;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dataFim = new Date(seguro.dataFim);

  if (dataFim < hoje) return 'Expirado';

  const diffDays = Math.ceil((dataFim - hoje) / (1000 * 60 * 60 * 24));
  if (diffDays <= 30) return 'Vence em breve';

  return 'Ativo';
};

const getStatusBadgeClass = (statusText) => {
  const statusMap = {
    ativo: 'status-ativo',
    expirado: 'status-inativo',
    cancelado: 'status-cancelado',
    'vence em breve': 'status-vence-em-breve',
  };

  return `status-badge ${statusMap[statusText?.toLowerCase()] || 'default'}`;
};

const getRowHighlightClass = (seguro) => {
  if (seguro.status !== 'Ativo') return 'status-row-inativo';

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dataFim = new Date(seguro.dataFim);
  const diffDays = Math.ceil((dataFim - hoje) / (1000 * 60 * 60 * 24));

  if (diffDays <= 7) return 'status-row-vencendo-danger';
  if (diffDays <= 30) return 'status-row-vencendo-warning';

  return 'status-row-ativo';
};

function SegurosPage() {
  const page = useSegurosPage();

  const isInitialLoading = page.loading && page.seguros.length === 0;
  const hasError = !!page.error;
  const isEmpty = !page.loading && !page.error && page.seguros.length === 0;

  return (
    <>
      <ModalConfirmacao
        isOpen={page.deleteModal.isOpen}
        onClose={page.deleteModal.closeModal}
        onConfirm={page.confirmarExclusao}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir a apólice nº ${page.deleteModal.modalData?.apoliceNumero}?`}
        isDestructive={true}
      />

      <PageLayout>
        <PageHeader
          title="Gestão de Seguros"
          icon={faShieldAlt}
          actions={
            <button type="button" className="btn btn-primary" onClick={page.goToCreate}>
              <FontAwesomeIcon icon={faPlus} /> Novo Seguro
            </button>
          }
          variant="light"
        />

        <PageSection variant="transparent" noPadding className="mb-6">
          <GlobalFilterBar
            searchTerm={page.searchTerm}
            onSearchChange={(e) => page.setSearchTerm(e.target.value)}
            searchPlaceholder="Buscar por apólice, vínculo ou seguradora..."
            selectFilters={page.selectFiltersConfig}
          />
        </PageSection>

        {(isInitialLoading || hasError || isEmpty) ? (
          <PageState
            loading={isInitialLoading}
            error={page.error?.message || page.error || ''}
            isEmpty={isEmpty}
            emptyMessage="Nenhum seguro encontrado."
          />
        ) : (
          <PageSection variant="transparent" noPadding>
            <div className="lista-contratos-moderna">
              {page.seguros.map((seguro) => {
                const statusDinamico = getDynamicStatus(seguro);

                return (
                  <div
                    key={seguro.id}
                    className={`contrato-card-expansivel ${getRowHighlightClass(seguro)}`}
                  >
                    <div className="contrato-header">
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '999px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#eff6ff',
                          color: '#2563eb',
                          border: '1px solid #bfdbfe',
                          flexShrink: 0,
                        }}
                      >
                        <FontAwesomeIcon icon={faShieldAlt} />
                      </div>

                      <div className="contrato-header-info">
                        <div>
                          <span className="header-label">Apólice</span>
                          <div className="header-value">{seguro.apoliceNumero}</div>
                        </div>

                        <div>
                          <span className="header-label">Seguradora</span>
                          <div className="header-value">{seguro.seguradora}</div>
                        </div>

                        <div>
                          <span className="header-label">Vínculo</span>
                          <div className="header-value">{seguro.nomeVinculo || '—'}</div>
                        </div>

                        <div>
                          <span className="header-label">Vigência Final</span>
                          <div className="header-value">{formatarData(seguro.dataFim)}</div>
                        </div>
                      </div>

                      <div
                        className="header-status-badge"
                        style={{ display: 'flex', alignItems: 'center', gap: '15px' }}
                      >
                        <span className={getStatusBadgeClass(statusDinamico)}>
                          {statusDinamico}
                        </span>
                      </div>
                    </div>

                    <div
                      className="contrato-detalhes-expandidos"
                      style={{ display: 'block' }}
                    >
                      <div className="detalhes-grid-contrato">
                        <div className="lista-cobertura">
                          <h5>
                            <FontAwesomeIcon icon={faBuilding} /> Unidade
                          </h5>
                          <div className="chips-container">
                            <span className="chip-item">
                              {seguro.unidade || seguro.unidade?.nomeSistema || 'Não informada'}
                            </span>
                          </div>
                        </div>

                        <div className="lista-cobertura">
                          <h5>
                            <FontAwesomeIcon icon={faShieldAlt} /> Coberturas
                          </h5>
                          <div className="chips-container">
                            {seguro.coberturas?.length > 0 ? (
                              seguro.coberturas.map((cobertura, index) => (
                                <span key={`${seguro.id}-cob-${index}`} className="chip-item">
                                  {cobertura.nome || cobertura.tipo || 'Cobertura'}
                                </span>
                              ))
                            ) : (
                              <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                Nenhuma cobertura cadastrada.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div
                        className="contrato-acoes-expandidas"
                        style={{
                          marginTop: '20px',
                          display: 'flex',
                          justifyContent: 'flex-end',
                          gap: '10px',
                        }}
                      >
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => page.goToDetails(seguro.id)}
                        >
                          <FontAwesomeIcon icon={faEye} /> Detalhes
                        </button>

                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => page.goToEdit(seguro.id)}
                        >
                          <FontAwesomeIcon icon={faEdit} /> Editar
                        </button>

                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => page.deleteModal.openModal(seguro)}
                        >
                          <FontAwesomeIcon icon={faTrashAlt} /> Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </PageSection>
        )}
      </PageLayout>
    </>
  );
}

export default SegurosPage;