import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';

import {
  Button,
  DateInput,
  Input,
  PageSection,
  ResponsiveGrid,
  Select,
} from '@/components/ui';

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

Field.propTypes = {
  label: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

function RelatoriosFiltersSection({
  filtros,
  tipoRelatorioOptions,
  unidadesOptions,
  fabricantesOptions,
  tiposOptions = [],
  escopoSeguroOptions = [],
  statusSeguroOptions = [],
  onChange,
  onSubmit,
  loading = false,
}) {
  const isManutencoes = filtros.tipoRelatorio === 'manutencoesRealizadas';
  const isInventario = filtros.tipoRelatorio === 'inventarioEquipamentos';
  const isOrcamentoCq = filtros.tipoRelatorio === 'orcamentoCq';
  const isSeguros = filtros.tipoRelatorio === 'inventarioSeguros';

  // Cada tipo mostra seu proprio conjunto de filtros — evita poluir a UI
  // com campos que nao se aplicam ao relatorio escolhido.
  const mostraFabricante = !isOrcamentoCq && !isSeguros;
  const mostraTipo = isInventario;
  const mostraDatas = isManutencoes;

  return (
    <PageSection
      title="Filtros do relatório"
      description={
        isOrcamentoCq
          ? 'Filtre por unidade para limitar o escopo. Em branco gera para todo o parque.'
          : 'Defina os critérios para gerar o relatório desejado.'
      }
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <ResponsiveGrid cols={{ base: 1, md: 2, xl: 4 }}>
          <Field label="Tipo de relatório">
            <Select
              name="tipoRelatorio"
              value={filtros.tipoRelatorio}
              onChange={onChange}
            >
              {tipoRelatorioOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Unidade">
            <Select
              name="unidadeId"
              value={filtros.unidadeId}
              onChange={onChange}
            >
              <option value="">Todas</option>
              {unidadesOptions.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </Select>
          </Field>

          {mostraFabricante && (
            <Field label="Fabricante">
              <Select
                name="fabricante"
                value={filtros.fabricante}
                onChange={onChange}
              >
                <option value="">Todos</option>
                {fabricantesOptions.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {mostraTipo && (
            <Field label="Tipo">
              <Select
                name="tipo"
                value={filtros.tipo || ''}
                onChange={onChange}
              >
                <option value="">Todos</option>
                {tiposOptions.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {mostraDatas ? (
            <Field label="Data início">
              <DateInput
                name="dataInicio"
                value={filtros.dataInicio}
                onChange={onChange}
              />
            </Field>
          ) : null}

          {mostraDatas && (
            <Field label="Data fim">
              <DateInput
                name="dataFim"
                value={filtros.dataFim}
                onChange={onChange}
                min={filtros.dataInicio || undefined}
              />
            </Field>
          )}

          {/* Filtros exclusivos do relatorio de Seguros */}
          {isSeguros && (
            <Field label="Escopo">
              <Select
                name="escopoSeguro"
                value={filtros.escopoSeguro || ''}
                onChange={onChange}
              >
                {escopoSeguroOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </Field>
          )}

          {isSeguros && (
            <Field label="Status da apólice">
              <Select
                name="status"
                value={filtros.status || ''}
                onChange={onChange}
              >
                {statusSeguroOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            </Field>
          )}

          {isSeguros && (
            <Field label="Seguradora (opcional)">
              <Input
                name="seguradora"
                value={filtros.seguradora || ''}
                onChange={onChange}
                placeholder="Ex.: Porto Seguro"
              />
            </Field>
          )}

          {isSeguros && (
            <Field label="Vencimento a partir de (opcional)">
              <DateInput
                name="vencimentoInicio"
                value={filtros.vencimentoInicio || ''}
                onChange={onChange}
              />
            </Field>
          )}

          {isSeguros && (
            <Field label="Vencimento até (opcional)">
              <DateInput
                name="vencimentoFim"
                value={filtros.vencimentoFim || ''}
                onChange={onChange}
                min={filtros.vencimentoInicio || undefined}
              />
            </Field>
          )}
        </ResponsiveGrid>

        <div className="flex flex-wrap items-end gap-3">
          <Button type="submit" disabled={loading}>
            <FontAwesomeIcon icon={faSearch} />
            {loading ? 'Gerando...' : 'Gerar relatório'}
          </Button>
        </div>
      </form>
    </PageSection>
  );
}

RelatoriosFiltersSection.propTypes = {
  filtros: PropTypes.object.isRequired,
  tipoRelatorioOptions: PropTypes.array.isRequired,
  unidadesOptions: PropTypes.array.isRequired,
  fabricantesOptions: PropTypes.array.isRequired,
  tiposOptions: PropTypes.array,
  escopoSeguroOptions: PropTypes.array,
  statusSeguroOptions: PropTypes.array,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default RelatoriosFiltersSection;
