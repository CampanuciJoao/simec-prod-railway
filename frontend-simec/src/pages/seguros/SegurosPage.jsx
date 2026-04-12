import React from 'react';
import { formatarData } from '../../utils/timeUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEdit,
  faTrashAlt,
  faEye,
  faBuilding,
  faShieldAlt,
  faPlus,
  faFileShield,
  faTriangleExclamation,
  faClockRotateLeft,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

import { useSegurosPage } from '../../hooks/seguros/useSegurosPage';

import GlobalFilterBar from '../../components/ui/GlobalFilterBar';
import ModalConfirmacao from '../../components/ui/ModalConfirmacao';
import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import PageState from '../../components/ui/PageState';
import Card from '../../components/ui/Card';

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
        title="Excluir seguro"
        message={`Tem certeza que deseja excluir a apólice nº ${page.deleteModal.modalData?.apoliceNumero}?`}
        isDestructive
      />

      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title="Gestão de Seguros"
          subtitle="Acompanhe, filtre e gerencie as apólices cadastradas"
          icon={faShieldAlt}
          actions={
            <button type="button" className="btn btn-primary" onClick={page.goToCreate}>
              <FontAwesomeIcon icon={faPlus} /> Novo Seguro
            </button>
          }
        />

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard
            icon={faFileShield}
            title="Total"
            value={page.metricas.total}
            tone="blue"
            onClick={page.clearAllFilters}
          />

          <KpiCard
            icon={faShieldAlt}
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
            title="Vencidos"
            value={page.metricas.vencidos}
            tone="red"
            onClick={() => page.filtrarPorStatus('Expirado')}
          />
        </div>

        <div className="mb-6">
          <GlobalFilterBar
            searchTerm={page.searchTerm}
            onSearchChange={page.onSearchChange}
            searchPlaceholder="Buscar por apólice, vínculo ou seguradora..."
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
            emptyMessage="Nenhum seguro encontrado."
          />
        ) : (
          <div className="flex flex-col gap-4">
            {page.seguros.map((seguro) => {
              const statusDinamico = page.getStatusDinamico(seguro);

              return (
                <div
                  key={seguro.id}
                  className={`overflow-hidden rounded-xl border-y border-r border-slate-200 border-l-[8px] bg-white shadow-sm transition-all hover:shadow-md ${getRowHighlightClass(
                    statusDinamico
                  )}`}
                >
                  <div className="flex flex-col gap-5 p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="flex min-w-0 flex-1 items-start gap-4">
                        <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600">
                          <FontAwesomeIcon icon={faShieldAlt} />
                        </div>

                        <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                              Apólice
                            </span>
                            <div className="mt-1 text-base font-bold text-slate-900">
                              {seguro.apoliceNumero}
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                              Seguradora
                            </span>
                            <div className="mt-1 text-sm font-semibold text-slate-800">
                              {seguro.seguradora}
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                              Vínculo
                            </span>
                            <div className="mt-1 text-sm font-semibold text-slate-800">
                              {seguro.nomeVinculo || '—'}
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                              Vigência final
                            </span>
                            <div className="mt-1 text-sm font-semibold text-slate-800">
                              {formatarData(seguro.dataFim)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${getStatusBadgeClass(
                            statusDinamico
                          )}`}
                        >
                          {statusDinamico}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[260px_1fr_auto]">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <h5 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                          <FontAwesomeIcon icon={faBuilding} className="text-slate-500" />
                          Unidade
                        </h5>

                        <span className="inline-flex rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200">
                          {page.getNomeUnidadeSeguro(seguro)}
                        </span>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <h5 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                          <FontAwesomeIcon icon={faShieldAlt} className="text-slate-500" />
                          Coberturas
                        </h5>

                        <div className="flex flex-wrap gap-2">
                          {seguro.coberturas?.length > 0 ? (
                            seguro.coberturas.map((cobertura, index) => (
                              <span
                                key={`${seguro.id}-cob-${index}`}
                                className="inline-flex rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200"
                              >
                                {cobertura.nome || cobertura.tipo || 'Cobertura'}
                              </span>
                            ))
                          ) : (
                            <p className="text-sm italic text-slate-400">
                              Nenhuma cobertura cadastrada.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col justify-end gap-2 xl:min-w-[160px]">
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
                </div>
              );
            })}
          </div>
        )}
      </PageLayout>
    </>
  );
}

export default SegurosPage;