import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faSpinner, faChartColumn } from '@fortawesome/free-solid-svg-icons';

import { useRelatoriosPage } from '../../hooks/relatorios/useRelatoriosPage';

import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import PageSection from '../../components/ui/PageSection';
import PageState from '../../components/ui/PageState';
import RelatorioResultado from '../../components/relatorios/RelatorioResultado';

function RelatoriosPage() {
  const page = useRelatoriosPage();

  const isInitialLoading = page.loadingFiltros;
  const hasError = !!page.error;

  return (
    <PageLayout>
      <PageHeader
        title="Geração de Relatórios"
        icon={faChartColumn}
        actions={
          page.resultadoRelatorio?.dados?.length ? (
            <button type="button" className="btn btn-danger" onClick={page.handleExportarPDF}>
              Exportar para PDF
            </button>
          ) : null
        }
        variant="light"
      />

      {(isInitialLoading || hasError) ? (
        <PageState
          loading={isInitialLoading}
          error={page.error || ''}
          isEmpty={false}
        />
      ) : (
        <>
          <PageSection title="Filtros do Relatório">
            <form onSubmit={page.handleGerarRelatorio} className="form-grid">
              <div className="form-group">
                <label>Tipo de Relatório</label>
                <select
                  name="tipoRelatorio"
                  value={page.filtros.tipoRelatorio}
                  onChange={page.handleFiltroChange}
                >
                  <option value="inventarioEquipamentos">
                    Inventário de Equipamentos
                  </option>
                  <option value="manutencoesRealizadas">
                    Manutenções Realizadas
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label>Unidade</label>
                <select
                  name="unidadeId"
                  value={page.filtros.unidadeId}
                  onChange={page.handleFiltroChange}
                >
                  <option value="">Todas</option>
                  {page.unidadesOptions.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Fabricante</label>
                <select
                  name="fabricante"
                  value={page.filtros.fabricante}
                  onChange={page.handleFiltroChange}
                >
                  <option value="">Todos</option>
                  {page.fabricantesOptions.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              {page.filtros.tipoRelatorio === 'manutencoesRealizadas' && (
                <>
                  <div className="form-group">
                    <label>Data Início</label>
                    <input
                      type="date"
                      name="dataInicio"
                      value={page.filtros.dataInicio}
                      onChange={page.handleFiltroChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Data Fim</label>
                    <input
                      type="date"
                      name="dataFim"
                      value={page.filtros.dataFim}
                      onChange={page.handleFiltroChange}
                    />
                  </div>
                </>
              )}

              <div className="form-group" style={{ alignSelf: 'end' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={page.loading}
                >
                  <FontAwesomeIcon icon={faSearch} />{' '}
                  {page.loading ? 'Gerando...' : 'Gerar Relatório'}
                </button>
              </div>
            </form>
          </PageSection>

          {page.loading && (
            <PageSection className="mt-6">
              <div style={{ textAlign: 'center' }}>
                <FontAwesomeIcon icon={faSpinner} spin size="2x" />
              </div>
            </PageSection>
          )}

          {!page.loading && page.resultadoRelatorio && (
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