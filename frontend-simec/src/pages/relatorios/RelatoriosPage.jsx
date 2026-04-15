import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

// HOOK
import { useRelatoriosPage } from '@/hooks/relatorios/useRelatoriosPage';

// DOMAIN
import {
  RelatoriosPageHeader,
  RelatoriosMetricsSection,
  RelatoriosFiltersSection,
  RelatoriosActiveFiltersBar,
  RelatorioResultado,
} from '@/components/relatorios';

// UI
import {
  PageLayout,
  PageSection,
  PageState,
} from '@/components/ui';

function RelatoriosPage() {
  const page = useRelatoriosPage();

  const isInitialLoading = page.loadingFiltros;
  const hasError = !!page.error && !page.loading;

  const hasResultado =
    !page.loading &&
    Array.isArray(page.resultadoRelatorio?.dados) &&
    page.resultadoRelatorio.dados.length > 0;

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
                <RelatorioResultado
                  resultado={page.resultadoRelatorio}
                />
              </PageSection>
            )}
          </>
        )}

      </div>
    </PageLayout>
  );
}

export default RelatoriosPage;