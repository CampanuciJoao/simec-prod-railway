import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

import { useRelatoriosPage } from '../../hooks/relatorios/useRelatoriosPage';

import PageLayout from '../../components/ui/PageLayout';
import PageState from '../../components/ui/PageState';
import PageSection from '../../components/ui/PageSection';

import {
  RelatoriosPageHeader,
  RelatoriosMetricsSection,
  RelatoriosFiltersSection,
  RelatoriosActiveFiltersBar,
  RelatorioResultado,
} from '../../components/relatorios';

function RelatoriosPage() {
  const page = useRelatoriosPage();

  const isInitialLoading = page.loadingFiltros;
  const hasError = !!page.error && !page.loading;
  const hasResultado =
    !page.loading && Array.isArray(page.resultadoRelatorio?.dados);

  return (
    <PageLayout background="slate" padded fullHeight>
      <div className="space-y-6">
        <RelatoriosPageHeader
          canExport={!!page.resultadoRelatorio?.dados?.length}
          onExport={page.handleExportarPDF}
        />

        {isInitialLoading || hasError ? (
          <PageState
            loading={isInitialLoading}
            error={page.error || ''}
            isEmpty={false}
          />
        ) : (
          <>
            <RelatoriosMetricsSection metricas={page.metricas} />

            <RelatoriosFiltersSection
              filtros={page.filtros}
              tipoRelatorioOptions={page.tipoRelatorioOptions}
              unidadesOptions={page.unidadesOptions}
              fabricantesOptions={page.fabricantesOptions}
              onChange={page.handleFiltroChange}
              onSubmit={page.handleGerarRelatorio}
              loading={page.loading}
            />

            <RelatoriosActiveFiltersBar
              filters={page.activeFilters}
              onRemove={page.clearFilter}
              onClearAll={page.clearAllFilters}
            />

            {page.loading && (
              <PageSection>
                <div className="flex justify-center py-6">
                  <FontAwesomeIcon icon={faSpinner} spin size="2x" />
                </div>
              </PageSection>
            )}

            {hasResultado && (
              <PageSection title="Resultado">
                <RelatorioResultado resultado={page.resultadoRelatorio} />
              </PageSection>
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
}

export default RelatoriosPage;