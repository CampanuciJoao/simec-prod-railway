import React from 'react';
import { formatarData } from '../../utils/timeUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEdit,
  faTrashAlt,
  faExclamationTriangle,
  faPlusCircle,
  faMinusCircle,
  faHospital,
  faMicrochip,
  faPaperclip,
  faUpload,
  faFilePdf,
  faExternalLinkAlt,
} from '@fortawesome/free-solid-svg-icons';

import { useContratosPage } from '../../hooks/contratos/useContratosPage';

import GlobalFilterBar from '../../components/ui/GlobalFilterBar';
import ModalConfirmacao from '../../components/ui/ModalConfirmacao';
import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import PageSection from '../../components/ui/PageSection';
import PageState from '../../components/ui/PageState';

const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const getDynamicStatus = (contrato) => {
  if (contrato.status !== 'Ativo') return contrato.status;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dataFim = new Date(contrato.dataFim);
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

const getRowHighlightClass = (contrato) => {
  if (contrato.status !== 'Ativo') return 'status-row-inativo';

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dataFim = new Date(contrato.dataFim);
  const diffDays = Math.ceil((dataFim - hoje) / (1000 * 60 * 60 * 24));

  if (diffDays <= 7) return 'status-row-vencendo-danger';
  if (diffDays <= 30) return 'status-row-vencendo-warning';

  return 'status-row-ativo';
};

function ContratosPage() {
  const page = useContratosPage();

  const isInitialLoading = page.loading && page.contratos.length === 0;
  const hasError = !!page.error;
  const isEmpty = !page.loading && !page.error && page.contratos.length === 0;

  return (
    <>
      <ModalConfirmacao
        isOpen={page.deleteModal.isOpen}
        onClose={page.deleteModal.closeModal}
        onConfirm={page.confirmarExclusao}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir o contrato nº ${page.deleteModal.modalData?.numeroContrato}?`}
        isDestructive={true}
      />

      <PageLayout>
        <PageHeader
          title="Gestão de Contratos de Manutenção"
          actions={
            <button type="button" className="btn btn-primary" onClick={page.goToCreate}>
              <FontAwesomeIcon icon={faPlusCircle} /> Novo Contrato
            </button>
          }
          variant="light"
        />

        <PageSection variant="transparent" noPadding className="mb-6">
          <GlobalFilterBar
            searchTerm={page.searchTerm}
            onSearchChange={(e) => page.setSearchTerm(e.target.value)}
            searchPlaceholder="Buscar por número, fornecedor..."
            selectFilters={page.selectFiltersConfig}
          />
        </PageSection>

        {(isInitialLoading || hasError || isEmpty) ? (
          <PageState
            loading={isInitialLoading}
            error={page.error?.message || page.error || ''}
            isEmpty={isEmpty}
            emptyMessage="Nenhum contrato encontrado."
          />
        ) : (
          <PageSection variant="transparent" noPadding>
            <div className="lista-contratos-moderna">
              {page.contratos.map((contrato) => {
                const isAberto = page.expandidos[contrato.id];
                const statusDinamico = getDynamicStatus(contrato);

                return (
                  <div
                    key={contrato.id}
                    className={`contrato-card-expansivel ${getRowHighlightClass(contrato)}`}
                  >
                    <div
                      className="contrato-header"
                      onClick={() => page.toggleExpandir(contrato.id)}
                    >
                      <FontAwesomeIcon
                        icon={isAberto ? faMinusCircle : faPlusCircle}
                        style={{ color: 'var(--cor-primaria-light)', fontSize: '1.3rem' }}
                      />

                      <div className="contrato-header-info">
                        <div>
                          <span className="header-label">Nº Contrato</span>
                          <div className="header-value">{contrato.numeroContrato}</div>
                        </div>
                        <div>
                          <span className="header-label">Fornecedor</span>
                          <div className="header-value">{contrato.fornecedor}</div>
                        </div>
                        <div>
                          <span className="header-label">Categoria</span>
                          <div className="header-value">{contrato.categoria}</div>
                        </div>
                        <div>
                          <span className="header-label">Vencimento</span>
                          <div className="header-value">{formatarData(contrato.dataFim)}</div>
                        </div>
                      </div>

                      <div
                        className="header-status-badge"
                        style={{ display: 'flex', alignItems: 'center', gap: '15px' }}
                      >
                        <span className={getStatusBadgeClass(statusDinamico)}>
                          {statusDinamico}
                        </span>

                        <FontAwesomeIcon
                          icon={faPaperclip}
                          style={{
                            color: contrato.anexos?.length > 0 ? '#22C55E' : '#CBD5E1',
                            fontSize: '1.1rem',
                          }}
                          title={
                            contrato.anexos?.length > 0
                              ? 'Documento anexado'
                              : 'Sem anexo'
                          }
                        />
                      </div>
                    </div>

                    {isAberto && (
                      <div className="contrato-detalhes-expandidos">
                        <div className="detalhes-grid-contrato">
                          <div className="lista-cobertura">
                            <h5>
                              <FontAwesomeIcon icon={faHospital} /> Unidades Cobertas
                            </h5>
                            <div className="chips-container">
                              {contrato.unidadesCobertas?.length > 0 ? (
                                contrato.unidadesCobertas.map((u) => (
                                  <span key={u.id} className="chip-item">
                                    {u.nomeSistema}
                                  </span>
                                ))
                              ) : (
                                <p>Nenhuma unidade vinculada.</p>
                              )}
                            </div>
                          </div>

                          <div className="lista-cobertura">
                            <h5>
                              <FontAwesomeIcon icon={faMicrochip} /> Equipamentos Vinculados ({contrato.equipamentosCobertos?.length || 0})
                            </h5>
                            <div
                              className="equipamentos-lista-scroll"
                              style={{ maxHeight: '250px', overflowY: 'auto' }}
                            >
                              {contrato.equipamentosCobertos?.length > 0 ? (
                                contrato.equipamentosCobertos.map((eq) => (
                                  <div key={eq.id} className="equip-item-contrato">
                                    <span>{eq.modelo}</span>
                                    <span className="equip-tag-contrato">{eq.tag}</span>
                                  </div>
                                ))
                              ) : (
                                <p
                                  style={{
                                    fontSize: '0.85rem',
                                    color: '#94a3b8',
                                    fontStyle: 'italic',
                                  }}
                                >
                                  Sem equipamentos específicos.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div
                          className="anexos-seguro-container"
                          style={{
                            marginTop: '20px',
                            background: '#f8fafc',
                            padding: '15px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          <h5
                            style={{
                              marginBottom: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              color: '#475569',
                              fontSize: '0.9rem',
                            }}
                          >
                            <FontAwesomeIcon icon={faPaperclip} /> DOCUMENTOS DO CONTRATO
                          </h5>

                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px',
                            }}
                          >
                            {contrato.anexos?.length > 0 ? (
                              contrato.anexos.map((anexo) => (
                                <div
                                  key={anexo.id}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: '#fff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    padding: '10px 12px',
                                  }}
                                >
                                  <a
                                    href={`${API_BASE_URL}/${anexo.path}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      textDecoration: 'none',
                                      color: '#2563eb',
                                      fontWeight: 600,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                    }}
                                  >
                                    <FontAwesomeIcon icon={faFilePdf} />
                                    {anexo.nomeOriginal}
                                    <FontAwesomeIcon icon={faExternalLinkAlt} size="xs" />
                                  </a>

                                  <button
                                    type="button"
                                    className="btn-action delete"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      page.handleDeleteAnexo(contrato.id, anexo.id);
                                    }}
                                  >
                                    <FontAwesomeIcon icon={faTrashAlt} />
                                  </button>
                                </div>
                              ))
                            ) : (
                              <p style={{ color: '#64748b', fontStyle: 'italic' }}>
                                Nenhum documento anexado.
                              </p>
                            )}

                            <div>
                              <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                                <FontAwesomeIcon
                                  icon={faUpload}
                                  spin={page.uploadingId === contrato.id}
                                />{' '}
                                {page.uploadingId === contrato.id ? 'Enviando...' : 'Enviar Documento'}
                                <input
                                  type="file"
                                  hidden
                                  onChange={(e) => page.handleUploadArquivo(contrato.id, e)}
                                />
                              </label>
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
                            onClick={() => page.goToEdit(contrato.id)}
                          >
                            <FontAwesomeIcon icon={faEdit} /> Editar
                          </button>

                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => page.deleteModal.openModal(contrato)}
                          >
                            <FontAwesomeIcon icon={faTrashAlt} /> Excluir
                          </button>
                        </div>
                      </div>
                    )}
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

export default ContratosPage;