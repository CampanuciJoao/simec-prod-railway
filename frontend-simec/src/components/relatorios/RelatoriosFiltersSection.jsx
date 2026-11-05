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
  SelectMenu,
} from '@/components/ui';

// Wrapper pra compatibilizar o SelectMenu (que recebe o valor direto)
// com o handleFiltroChange da pagina (que espera um evento com target).
// Sinteza o shape minimo que o handler precisa (target.name, target.value).
function fakeEvent(name, value) {
  return { target: { name, value } };
}

function RelatoriosFiltersSection({
  filtros,
  tipoRelatorioOptions,
  unidadesOptions,
  fabricantesOptions,
  tiposOptions = [],
  escopoSeguroOptions = [],
  statusSeguroOptions = [],
  statusEquipamentoOptions = [],
  plantasSolarOptions = [],
  invertersOptions = [],
  onChange,
  onSubmit,
  loading = false,
}) {
  const isManutencoes = filtros.tipoRelatorio === 'manutencoesRealizadas';
  const isInventario = filtros.tipoRelatorio === 'inventarioEquipamentos';
  const isOrcamentoCq = filtros.tipoRelatorio === 'orcamentoCq';
  const isSeguros = filtros.tipoRelatorio === 'inventarioSeguros';
  const isSolarProducao = filtros.tipoRelatorio === 'solarProducao';
  const isSolarFalhas = filtros.tipoRelatorio === 'solarFalhas';
  const isSolar = isSolarProducao || isSolarFalhas;

  // Cada tipo mostra seu proprio conjunto de filtros — evita poluir a UI
  // com campos que nao se aplicam ao relatorio escolhido.
  const mostraFabricante = !isOrcamentoCq && !isSeguros && !isSolar;
  const mostraTipo = isInventario;
  const mostraDatas = isManutencoes || isSolar;
  const mostraUnidade = !isSolar;    // solar usa "planta" em vez de "unidade"

  const pick = (name) => (v) => onChange(fakeEvent(name, v));

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
          <SelectMenu
            label="Tipo de relatório"
            value={filtros.tipoRelatorio}
            onChange={pick('tipoRelatorio')}
            options={tipoRelatorioOptions}
          />

          {mostraUnidade && (
            <SelectMenu
              label="Unidade"
              value={filtros.unidadeId}
              onChange={pick('unidadeId')}
              placeholder="Todas"
              options={unidadesOptions}
            />
          )}

          {isSolar && (
            <SelectMenu
              label="Planta solar"
              value={filtros.plantaId || ''}
              onChange={pick('plantaId')}
              placeholder="Selecione"
              options={plantasSolarOptions}
            />
          )}

          {isSolarFalhas && filtros.plantaId && (
            <SelectMenu
              label="Inversor (opcional)"
              value={filtros.inverterId || ''}
              onChange={pick('inverterId')}
              placeholder="Todos da planta"
              options={invertersOptions}
            />
          )}

          {mostraFabricante && (
            <SelectMenu
              label="Fabricante"
              value={filtros.fabricante}
              onChange={pick('fabricante')}
              placeholder="Todos"
              options={fabricantesOptions}
            />
          )}

          {mostraTipo && (
            <SelectMenu
              label="Tipo"
              value={filtros.tipo || ''}
              onChange={pick('tipo')}
              placeholder="Todos"
              options={tiposOptions}
            />
          )}

          {/* Status operacional — so pro inventario. Reusa o campo
              `status` do filtros; o hook limpa esse valor ao trocar
              o tipo de relatorio pra evitar vazamento entre dominios. */}
          {isInventario && (
            <SelectMenu
              label="Status"
              value={filtros.status || ''}
              onChange={pick('status')}
              options={statusEquipamentoOptions}
            />
          )}

          {mostraDatas && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider"
                     style={{ color: 'var(--text-muted)' }}>
                Data início
              </label>
              <DateInput
                name="dataInicio"
                value={filtros.dataInicio}
                onChange={onChange}
              />
            </div>
          )}

          {mostraDatas && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider"
                     style={{ color: 'var(--text-muted)' }}>
                Data fim
              </label>
              <DateInput
                name="dataFim"
                value={filtros.dataFim}
                onChange={onChange}
                min={filtros.dataInicio || undefined}
              />
            </div>
          )}

          {/* Filtros exclusivos do relatorio de Seguros */}
          {isSeguros && (
            <SelectMenu
              label="Escopo"
              value={filtros.escopoSeguro || ''}
              onChange={pick('escopoSeguro')}
              options={escopoSeguroOptions}
            />
          )}

          {isSeguros && (
            <SelectMenu
              label="Status da apólice"
              value={filtros.status || ''}
              onChange={pick('status')}
              options={statusSeguroOptions}
            />
          )}

          {isSeguros && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider"
                     style={{ color: 'var(--text-muted)' }}>
                Seguradora (opcional)
              </label>
              <Input
                name="seguradora"
                value={filtros.seguradora || ''}
                onChange={onChange}
                placeholder="Ex.: Porto Seguro"
              />
            </div>
          )}

          {isSeguros && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider"
                     style={{ color: 'var(--text-muted)' }}>
                Vencimento a partir de (opcional)
              </label>
              <DateInput
                name="vencimentoInicio"
                value={filtros.vencimentoInicio || ''}
                onChange={onChange}
              />
            </div>
          )}

          {isSeguros && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider"
                     style={{ color: 'var(--text-muted)' }}>
                Vencimento até (opcional)
              </label>
              <DateInput
                name="vencimentoFim"
                value={filtros.vencimentoFim || ''}
                onChange={onChange}
                min={filtros.vencimentoInicio || undefined}
              />
            </div>
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
  statusEquipamentoOptions: PropTypes.array,
  plantasSolarOptions: PropTypes.array,
  invertersOptions: PropTypes.array,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default RelatoriosFiltersSection;
