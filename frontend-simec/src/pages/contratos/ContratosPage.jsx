import React from 'react';
import { formatarData } from '../../utils/timeUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEdit,
  faTrashAlt,
  faPlusCircle,
  faMinusCircle,
  faHospital,
  faMicrochip,
  faPaperclip,
  faUpload,
  faFilePdf,
  faExternalLinkAlt,
  faFileContract,
  faClockRotateLeft,
  faTriangleExclamation,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

import { useContratosPage } from '../../hooks/contratos/useContratosPage';

import GlobalFilterBar from '../../components/ui/GlobalFilterBar';
import ModalConfirmacao from '../../components/ui/ModalConfirmacao';
import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import PageState from '../../components/ui/PageState';
import Card from '../../components/ui/Card';

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const getStatusBadgeClass = (statusText) => {
  const normalized = String(statusText || '').toLowerCase();

  if (normalized === 'ativo') {
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  }

  if (normalized === 'vence em breve') {
    return 'bg-amber-100 text-amber-700 border-amber-200';
  }

  if (normalized === 'expirado') {
    return 'bg-red-100 text-red-700 border-red-200';
  }

  if (normalized === 'cancelado') {
    return 'bg-slate-100 text-slate-700 border-slate-200';
  }

  return 'bg-slate-100 text-slate-700 border-slate-200';
};

const getRowHighlightClass = (statusText) => {
  const normalized = String(statusText || '').toLowerCase();

  if (normalized === 'ativo') return 'border-l-emerald-500';
  if (normalized === 'vence em breve') return 'border-l-amber-500';
  if (normalized === 'expirado') return 'border-l-red-500';
  if (normalized === 'cancelado') return 'border-l-slate-400';

  return 'border-l-slate-300';
};

function KpiCard({ icon, title, value, tone = 'slate', onClick }) {
  const toneMap = {
    slate: 'bg-slate-100 text-slate-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-emerald-100 text-emerald-600',
    yellow: 'bg-amber-100 text-amber-600',
    red: 'bg-red-100 text-red-600',
  };

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={[
        'w-full text-left',
        onClick ? 'transition hover:-translate-y-0.5 hover:shadow-md' : '',
      ].join(' ')}
    >
      <Card className="h-full">
        <div className="flex items-center gap-4">
          <div
            className={[
              'inline-flex h-12 w-12 items-center justify-center rounded-2xl',
              toneMap[tone] || toneMap.slate,
            ].join(' ')}
          >
            <FontAwesomeIcon icon={icon} />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {title}
            </p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              {value}
            </p>
          </div>
        </div>
      </Card>
    </Wrapper>
  );
}

function ActiveFiltersBar({ filters = [], onRemove, onClearAll }) {
  if (!filters.length) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <button
          key={`${filter.key}-${filter.value}`}
          type="button"
          onClick={() => onRemove(filter.key)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <span>{filter.label}</span>
          <FontAwesomeIcon icon={faXmark} className="text-[10px]" />
        </button>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className="ml-1 inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold text-blue-600 hover:underline"
      >
        Limpar tudo
      </button>
    </div>
  );
}

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
        title="Excluir contrato"
        message={`Tem certeza que deseja excluir o contrato nº ${page.deleteModal.modalData?.numeroContrato}?`}
        isDestructive
      />

      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title="Gestão de Contratos de Manutenção"
          subtitle="Acompanhe, filtre e gerencie os contratos cadastrados"
          icon={faFileContract}
          actions={
            <button type="button" className="btn btn-primary" onClick={page.goToCreate}>
              <FontAwesomeIcon icon={faPlusCircle} /> Novo Contrato
            </button>
          }
        />

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard
            icon={faFileContract}
            title="Total"
            value={page.metricas.total}
            tone="blue"
            onClick={page.clearAllFilters}
          />

          <KpiCard
            icon={faFileContract}
            title="Ativos"
            value={page.metricas.ativos}
            tone="green"
            onClick={() => page.filtrarPorStatus('Ativo')}
          />

          <KpiCard
            icon={faClockRotateLeft}
            title="Vencendo"
            value={page.metricas.vencendo}
            tone="yellow"
            onClick={() => page.filtrarPorStatus('Vence em breve')}
          />

          <KpiCard
            icon={faTriangleExclamation}
            title="Expirados"
            value={page.metricas.expirados}
            tone="red"
            onClick={() => page.filtrarPorStatus('Expirado')}
          />
        </div>

        <div className="mb-6">
          <GlobalFilterBar
            searchTerm={page.searchTerm}
            onSearchChange={page.onSearchChange}
            searchPlaceholder="Buscar por número, fornecedor..."
            selectFilters={page.selectFiltersConfig}
          />
        </div>

        <ActiveFiltersBar
          filters={page.activeFilters}
          onRemove={page.clearFilter}
          onClearAll={page.clearAllFilters}
        />

        {isInitialLoading || hasError || isEmpty ? (
          <PageState
            loading={isInitialLoading}
            error={page.error?.message || page.error || ''}
            isEmpty={isEmpty}
            emptyMessage="Nenhum contrato encontrado."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {page.contratos.map((contrato) => {
              const isAberto = page.expandidos[contrato.id];
              const statusDinamico = page.getDynamicStatus(contrato);

              return (
                <div
                  key={contrato.id}
                  className={`overflow-hidden rounded-xl border-y border-r border-slate-200 border-l-[8px] bg-white shadow-sm transition-all hover:shadow-md ${getRowHighlightClass(
                    statusDinamico
                  )}`}
                >
                  <div
                    className="flex cursor-pointer flex-col gap-4 p-5 xl:flex-row xl:items-center xl:justify-between"
                    onClick={() => page.toggleExpandir(contrato.id)}
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-4">
                      <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600">
                        <FontAwesomeIcon
                          icon={isAberto ? faMinusCircle : faPlusCircle}
                        />
                      </div>

                      <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            Nº Contrato
                          </span>
                          <div className="mt-1 text-base font-bold text-slate-900">
                            {contrato.numeroContrato}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            Fornecedor
                          </span>
                          <div className="mt-1 text-sm font-semibold text-slate-800">
                            {contrato.fornecedor}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            Categoria
                          </span>
                          <div className="mt-1 text-sm font-semibold text-slate-800">
                            {contrato.categoria}
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            Vencimento
                          </span>
                          <div className="mt-1 text-sm font-semibold text-slate-800">
                            {formatarData(contrato.dataFim)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusBadgeClass(
                          statusDinamico
                        )}`}
                      >
                        {statusDinamico}
                      </span>

                      <FontAwesomeIcon
                        icon={faPaperclip}
                        className={
                          contrato.anexos?.length > 0
                            ? 'text-green-500'
                            : 'text-slate-300'
                        }
                        title={
                          contrato.anexos?.length > 0
                            ? 'Documento anexado'
                            : 'Sem anexo'
                        }
                      />
                    </div>
                  </div>

                  {isAberto && (
                    <div className="border-t border-slate-200 bg-slate-50/70 p-5">
                      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr]">
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <h5 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                            <FontAwesomeIcon icon={faHospital} className="text-slate-500" />
                            Unidades cobertas
                          </h5>

                          <div className="flex flex-wrap gap-2">
                            {contrato.unidadesCobertas?.length > 0 ? (
                              contrato.unidadesCobertas.map((u) => (
                                <span
                                  key={u.id}
                                  className="inline-flex rounded-full bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200"
                                >
                                  {u.nomeSistema}
                                </span>
                              ))
                            ) : (
                              <p className="text-sm italic text-slate-400">
                                Nenhuma unidade vinculada.
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <h5 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                            <FontAwesomeIcon icon={faMicrochip} className="text-slate-500" />
                            Equipamentos vinculados ({contrato.equipamentosCobertos?.length || 0})
                          </h5>

                          <div className="max-h-[250px] overflow-y-auto pr-1">
                            {contrato.equipamentosCobertos?.length > 0 ? (
                              <div className="flex flex-col gap-2">
                                {contrato.equipamentosCobertos.map((eq) => (
                                  <div
                                    key={eq.id}
                                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                                  >
                                    <span className="text-sm font-medium text-slate-800">
                                      {eq.modelo}
                                    </span>
                                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                                      {eq.tag}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm italic text-slate-400">
                                Sem equipamentos específicos.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
                        <h5 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                          <FontAwesomeIcon icon={faPaperclip} className="text-slate-500" />
                          Documentos do contrato
                        </h5>

                        <div className="flex flex-col gap-3">
                          {contrato.anexos?.length > 0 ? (
                            contrato.anexos.map((anexo) => (
                              <div
                                key={anexo.id}
                                className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                              >
                                <a
                                  href={`${API_BASE_URL}/${anexo.path}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 no-underline hover:underline"
                                >
                                  <FontAwesomeIcon icon={faFilePdf} />
                                  <span>{anexo.nomeOriginal}</span>
                                  <FontAwesomeIcon icon={faExternalLinkAlt} size="xs" />
                                </a>

                                <button
                                  type="button"
                                  className="btn btn-danger"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    page.handleDeleteAnexo(contrato.id, anexo.id);
                                  }}
                                >
                                  <FontAwesomeIcon icon={faTrashAlt} /> Remover
                                </button>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm italic text-slate-400">
                              Nenhum documento anexado.
                            </p>
                          )}

                          <div>
                            <label className="btn btn-secondary cursor-pointer">
                              <FontAwesomeIcon
                                icon={faUpload}
                                spin={page.uploadingId === contrato.id}
                              />{' '}
                              {page.uploadingId === contrato.id
                                ? 'Enviando...'
                                : 'Enviar documento'}
                              <input
                                type="file"
                                hidden
                                onChange={(e) => page.handleUploadArquivo(contrato.id, e)}
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 flex justify-end gap-2">
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
        )}
      </PageLayout>
    </>
  );
}

export default ContratosPage;