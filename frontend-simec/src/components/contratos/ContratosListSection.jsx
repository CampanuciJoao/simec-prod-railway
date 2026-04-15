import React from 'react';
import PropTypes from 'prop-types';
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

import { formatarData } from '../../utils/timeUtils';
import {
  getDynamicStatus,
  getStatusBadgeVariant,
  getRowHighlightClass,
} from '../../utils/contratos';

import GlobalFilterBar from '../ui/GlobalFilterBar';
import PageSection from '../ui/PageSection';
import ResponsiveGrid from '../ui/ResponsiveGrid';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/primitives/Button';

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

function KpiCard({ icon, title, value, tone = 'slate', onClick }) {
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
              tone === 'blue'
                ? 'bg-blue-100 text-blue-600'
                : tone === 'green'
                  ? 'bg-emerald-100 text-emerald-600'
                  : tone === 'yellow'
                    ? 'bg-amber-100 text-amber-600'
                    : tone === 'red'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-slate-100 text-slate-600',
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
    <div className="flex flex-wrap items-center gap-2">
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

function ContratoRow({
  contrato,
  isAberto,
  onToggleExpandir,
  onUploadArquivo,
  onDeleteAnexo,
  onEdit,
  onDelete,
  uploadingId,
}) {
  const statusDinamico = getDynamicStatus(contrato);
  const badgeVariant = getStatusBadgeVariant(statusDinamico);

  return (
    <div
      className={[
        'overflow-hidden rounded-xl border-y border-r border-slate-200 border-l-[8px] bg-white shadow-sm transition-all hover:shadow-md',
        getRowHighlightClass(statusDinamico),
      ].join(' ')}
    >
      <div
        className="flex cursor-pointer flex-col gap-4 p-5 xl:flex-row xl:items-center xl:justify-between"
        onClick={() => onToggleExpandir(contrato.id)}
      >
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600">
            <FontAwesomeIcon icon={isAberto ? faMinusCircle : faPlusCircle} />
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
          <Badge variant={badgeVariant}>{statusDinamico}</Badge>

          <FontAwesomeIcon
            icon={faPaperclip}
            className={
              contrato.anexos?.length > 0 ? 'text-green-500' : 'text-slate-300'
            }
            title={
              contrato.anexos?.length > 0 ? 'Documento anexado' : 'Sem anexo'
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

                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteAnexo(contrato.id, anexo.id);
                      }}
                    >
                      <FontAwesomeIcon icon={faTrashAlt} />
                      Remover
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm italic text-slate-400">
                  Nenhum documento anexado.
                </p>
              )}

              <div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                  <FontAwesomeIcon
                    icon={faUpload}
                    spin={uploadingId === contrato.id}
                  />
                  {uploadingId === contrato.id
                    ? 'Enviando...'
                    : 'Enviar documento'}

                  <input
                    type="file"
                    hidden
                    onChange={(e) => onUploadArquivo(contrato.id, e)}
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onEdit(contrato.id)}
            >
              <FontAwesomeIcon icon={faEdit} />
              Editar
            </Button>

            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => onDelete(contrato)}
            >
              <FontAwesomeIcon icon={faTrashAlt} />
              Excluir
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ContratosListSection({
  contratos,
  metricas,
  searchTerm,
  onSearchChange,
  selectFiltersConfig,
  activeFilters,
  clearFilter,
  clearAllFilters,
  filtrarPorStatus,
  expandidos,
  toggleExpandir,
  uploadingId,
  handleUploadArquivo,
  handleDeleteAnexo,
  goToEdit,
  onAskDelete,
}) {
  return (
    <div className="space-y-6">
      <ResponsiveGrid cols={{ base: 1, md: 2, xl: 4 }}>
        <KpiCard
          icon={faFileContract}
          title="Total"
          value={metricas.total}
          tone="blue"
          onClick={clearAllFilters}
        />

        <KpiCard
          icon={faFileContract}
          title="Ativos"
          value={metricas.ativos}
          tone="green"
          onClick={() => filtrarPorStatus('Ativo')}
        />

        <KpiCard
          icon={faClockRotateLeft}
          title="Vencendo"
          value={metricas.vencendo}
          tone="yellow"
          onClick={() => filtrarPorStatus('Vence em breve')}
        />

        <KpiCard
          icon={faTriangleExclamation}
          title="Expirados"
          value={metricas.expirados}
          tone="red"
          onClick={() => filtrarPorStatus('Expirado')}
        />
      </ResponsiveGrid>

      <GlobalFilterBar
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        searchPlaceholder="Buscar por número, fornecedor..."
        selectFilters={selectFiltersConfig}
      />

      <ActiveFiltersBar
        filters={activeFilters}
        onRemove={clearFilter}
        onClearAll={clearAllFilters}
      />

      <PageSection
        title="Contratos cadastrados"
        description="Visualize detalhes, cobertura, documentos e ações disponíveis."
      >
        <div className="flex flex-col gap-4">
          {contratos.map((contrato) => (
            <ContratoRow
              key={contrato.id}
              contrato={contrato}
              isAberto={!!expandidos[contrato.id]}
              onToggleExpandir={toggleExpandir}
              onUploadArquivo={handleUploadArquivo}
              onDeleteAnexo={handleDeleteAnexo}
              onEdit={goToEdit}
              onDelete={onAskDelete}
              uploadingId={uploadingId}
            />
          ))}
        </div>
      </PageSection>
    </div>
  );
}

ContratosListSection.propTypes = {
  contratos: PropTypes.array.isRequired,
  metricas: PropTypes.object.isRequired,
  searchTerm: PropTypes.string,
  onSearchChange: PropTypes.func.isRequired,
  selectFiltersConfig: PropTypes.array.isRequired,
  activeFilters: PropTypes.array,
  clearFilter: PropTypes.func.isRequired,
  clearAllFilters: PropTypes.func.isRequired,
  filtrarPorStatus: PropTypes.func.isRequired,
  expandidos: PropTypes.object.isRequired,
  toggleExpandir: PropTypes.func.isRequired,
  uploadingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  handleUploadArquivo: PropTypes.func.isRequired,
  handleDeleteAnexo: PropTypes.func.isRequired,
  goToEdit: PropTypes.func.isRequired,
  onAskDelete: PropTypes.func.isRequired,
};

export default ContratosListSection;