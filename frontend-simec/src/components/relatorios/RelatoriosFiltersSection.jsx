import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';

import PageSection from '../ui/PageSection';
import ResponsiveGrid from '../ui/ResponsiveGrid';
import Select from '../ui/Select';
import DateInput from '../ui/DateInput';
import Button from '../ui/Button';

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
  onChange,
  onSubmit,
  loading = false,
}) {
  const isManutencoes = filtros.tipoRelatorio === 'manutencoesRealizadas';

  return (
    <PageSection
      title="Filtros do relatório"
      description="Defina os critérios para gerar o relatório desejado."
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

          {isManutencoes ? (
            <Field label="Data início">
              <DateInput
                name="dataInicio"
                value={filtros.dataInicio}
                onChange={onChange}
              />
            </Field>
          ) : (
            <div className="hidden xl:block" />
          )}

          {isManutencoes && (
            <Field label="Data fim">
              <DateInput
                name="dataFim"
                value={filtros.dataFim}
                onChange={onChange}
                min={filtros.dataInicio || undefined}
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
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default RelatoriosFiltersSection;