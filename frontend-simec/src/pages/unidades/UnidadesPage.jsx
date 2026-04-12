import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faEdit,
  faTrashAlt,
  faInfoCircle,
  faMapMarkedAlt,
  faHashtag,
  faBuilding,
  faCity,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

import { useUnidadesPage } from '../../hooks/unidades/useUnidadesPage';

import ModalConfirmacao from '../../components/ui/ModalConfirmacao';
import GlobalFilterBar from '../../components/ui/GlobalFilterBar';
import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import PageState from '../../components/ui/PageState';
import Card from '../../components/ui/Card';

const formatarEndereco = (unidade) => {
  if (!unidade || !unidade.logradouro) return 'Endereço não cadastrado';

  const parts = [
    `${unidade.logradouro}, ${unidade.numero || 'S/N'}`,
    unidade.complemento,
    unidade.bairro,
    `${unidade.cidade || ''}${unidade.estado ? ` - ${unidade.estado}` : ''}`,
    unidade.cep ? `CEP: ${unidade.cep}` : '',
  ];

  return parts.filter(Boolean).join(', ');
};

function KpiCard({ icon, title, value, tone = 'slate', onClick }) {
  const toneMap = {
    slate: 'bg-slate-100 text-slate-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-emerald-100 text-emerald-600',
    yellow: 'bg-amber-100 text-amber-600',
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

function UnidadesPage() {
  const page = useUnidadesPage();

  const isInitialLoading = page.loading && page.unidades.length === 0;
  const hasError = !!page.error;
  const isEmpty = !page.loading && !page.error && page.unidades.length === 0;

  return (
    <PageLayout background="slate" padded fullHeight>
      <ModalConfirmacao
        isOpen={page.deleteModal.isOpen}
        onClose={page.deleteModal.closeModal}
        onConfirm={page.confirmarExclusao}
        title="Excluir unidade"
        message={`Tem certeza que deseja excluir a unidade "${page.deleteModal.modalData?.nomeSistema}"?`}
        isDestructive
      />

      <PageHeader
        title="Unidades"
        subtitle="Acompanhe e gerencie as unidades cadastradas"
        icon={faBuilding}
        actions={
          <button className="btn btn-primary" onClick={page.goToCreate}>
            <FontAwesomeIcon icon={faPlus} />
            Nova Unidade
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          icon={faBuilding}
          title="Total"
          value={page.metricas.total}
          tone="blue"
          onClick={page.clearAllFilters}
        />

        <KpiCard
          icon={faHashtag}
          title="Com CNPJ"
          value={page.metricas.comCnpj}
          tone="green"
        />

        <KpiCard
          icon={faInfoCircle}
          title="Sem CNPJ"
          value={page.metricas.semCnpj}
          tone="yellow"
        />

        <KpiCard
          icon={faCity}
          title="Cidades"
          value={page.metricas.cidadesAtendidas}
          tone="slate"
        />
      </div>

      <div className="mb-6">
        <GlobalFilterBar
          searchTerm={page.searchTerm}
          onSearchChange={page.onSearchChange}
          searchPlaceholder="Buscar por nome, fantasia ou CNPJ..."
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
          emptyMessage="Nenhuma unidade encontrada."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {page.unidades.map((unidade) => (
            <Card key={unidade.id} className="flex h-full flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h4 className="text-lg font-semibold text-slate-900">
                    {unidade.nomeSistema}
                  </h4>
                  <p className="mt-1 text-sm text-slate-500">
                    {unidade.nomeFantasia || 'Nome fantasia não informado'}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    className="btn btn-ghost"
                    onClick={() => page.goToEdit(unidade.id)}
                    title="Editar unidade"
                  >
                    <FontAwesomeIcon icon={faEdit} />
                  </button>

                  <button
                    className="btn btn-ghost text-red-600 hover:text-red-700"
                    onClick={() => page.deleteModal.openModal(unidade)}
                    title="Excluir unidade"
                  >
                    <FontAwesomeIcon icon={faTrashAlt} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3 text-sm text-slate-600">
                <div className="flex items-start gap-2">
                  <FontAwesomeIcon icon={faHashtag} className="mt-0.5 text-slate-400" />
                  <span>{unidade.cnpj || 'CNPJ não informado'}</span>
                </div>

                <div className="flex items-start gap-2">
                  <FontAwesomeIcon icon={faCity} className="mt-0.5 text-slate-400" />
                  <span>
                    {[unidade.cidade, unidade.estado].filter(Boolean).join(' - ') ||
                      'Cidade/estado não informados'}
                  </span>
                </div>

                <div className="flex items-start gap-2">
                  <FontAwesomeIcon
                    icon={faMapMarkedAlt}
                    className="mt-0.5 text-slate-400"
                  />
                  <span>{formatarEndereco(unidade)}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageLayout>
  );
}

export default UnidadesPage;