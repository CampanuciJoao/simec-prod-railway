import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faSpinner,
  faChartColumn,
  faFilePdf,
  faFileLines,
  faIndustry,
  faBuilding,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

import { useRelatoriosPage } from '../../hooks/relatorios/useRelatoriosPage';

import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import PageState from '../../components/ui/PageState';
import PageSection from '../../components/ui/PageSection';
import Card from '../../components/ui/Card';
import RelatorioResultado from '../../components/relatorios/RelatorioResultado';

function KpiCard({ icon, title, value, tone = 'slate' }) {
  const toneMap = {
    slate: 'bg-slate-100 text-slate-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-emerald-100 text-emerald-600',
    yellow: 'bg-amber-100 text-amber-600',
  };

  return (
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

function RelatoriosPage() {
  const page = useRelatoriosPage();

  const isInitialLoading = page.loadingFiltros;
  const hasError = !!page.error && !page.loading;
  const hasResultado =
    !page.loading && Array.isArray(page.resultadoRelatorio?.dados);

  return (
    <PageLayout background="slate" padded fullHeight>
      <PageHeader
        title="Geração de Relatórios"
        subtitle="Monte filtros, gere resultados e exporte para PDF"
        icon={faChartColumn}
        actions={
          page.resultadoRelatorio?.dados?.length ? (
            <button
              type="button"
              className="btn btn-danger"
              onClick={page.handleExportarPDF}
            >
              <FontAwesomeIcon icon={faFilePdf} />
              Exportar para PDF
            </button>
          ) : null
        }
      />

      {isInitialLoading || hasError ? (
        <PageState
          loading={isInitialLoading}
          error={page.error || ''}
          isEmpty={false}
        />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <KpiCard
              icon={faFileLines}
              title="Tipo atual"
              value={page.metricas.tipoAtual}
              tone="blue"
            />

            <KpiCard
              icon={faBuilding}
              title="Unidades"
              value={page.metricas.unidades}
              tone="green"
            />

            <KpiCard
              icon={faIndustry}
              title="Fabricantes"
              value={page.metricas.fabricantes}
              tone="yellow"
            />

            <KpiCard
              icon={faChartColumn}
              title="Registros"
              value={page.metricas.registros}
              tone="slate"
            />
          </div>

          <PageSection title="Filtros do relatório">
            <form onSubmit={page.handleGerarRelatorio} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className="label">Tipo de relatório</label>
                  <select
                    name="tipoRelatorio"
                    value={page.filtros.tipoRelatorio}
                    onChange={page.handleFiltroChange}
                    className="select"
                  >
                    {page.tipoRelatorioOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Unidade</label>
                  <select
                    name="unidadeId"
                    value={page.filtros.unidadeId}
                    onChange={page.handleFiltroChange}
                    className="select"
                  >
                    <option value="">Todas</option>
                    {page.unidadesOptions.map((u) => (
                      <option key={u.value} value={u.value}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Fabricante</label>
                  <select
                    name="fabricante"
                    value={page.filtros.fabricante}
                    onChange={page.handleFiltroChange}
                    className="select"
                  >
                    <option value="">Todos</option>
                    {page.fabricantesOptions.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                {page.filtros.tipoRelatorio === 'manutencoesRealizadas' ? (
                  <div>
                    <label className="label">Data início</label>
                    <input
                      type="date"
                      name="dataInicio"
                      value={page.filtros.dataInicio}
                      onChange={page.handleFiltroChange}
                      className="input"
                    />
                  </div>
                ) : (
                  <div className="hidden xl:block" />
                )}

                {page.filtros.tipoRelatorio === 'manutencoesRealizadas' && (
                  <div>
                    <label className="label">Data fim</label>
                    <input
                      type="date"
                      name="dataFim"
                      value={page.filtros.dataFim}
                      onChange={page.handleFiltroChange}
                      className="input"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={page.loading}
                >
                  <FontAwesomeIcon icon={faSearch} />
                  {page.loading ? 'Gerando...' : 'Gerar relatório'}
                </button>
              </div>
            </form>
          </PageSection>

          <ActiveFiltersBar
            filters={page.activeFilters}
            onRemove={page.clearFilter}
            onClearAll={page.clearAllFilters}
          />

          {page.loading && (
            <PageSection className="mt-6">
              <div className="flex justify-center py-6">
                <FontAwesomeIcon icon={faSpinner} spin size="2x" />
              </div>
            </PageSection>
          )}

          {hasResultado && (
            <PageSection title="Resultado" className="mt-6">
              <RelatorioResultado resultado={page.resultadoRelatorio} />
            </PageSection>
          )}
        </>
      )}
    </PageLayout>
  );
}

export default RelatoriosPage;