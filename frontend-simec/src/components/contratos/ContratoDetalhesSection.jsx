import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileContract,
  faBuilding,
  faCalendarDays,
  faCircleInfo,
  faHospital,
  faMicrochip,
} from '@fortawesome/free-solid-svg-icons';

import PageSection from '../ui/PageSection';
import ResponsiveGrid from '../ui/ResponsiveGrid';
import Badge from '../ui/Badge';
import { formatarData } from '../../utils/timeUtils';
import { getDynamicStatus, getStatusBadgeVariant } from '../../utils/contratos';

function InfoCard({ icon, label, value, fullWidth = false }) {
  return (
    <div
      className={[
        'rounded-xl border border-slate-200 bg-white p-4 shadow-sm',
        fullWidth ? 'md:col-span-2 xl:col-span-3' : '',
      ].join(' ')}
    >
      <div className="flex items-center gap-2 text-slate-500">
        <FontAwesomeIcon icon={icon} className="text-xs" />
        <span className="text-[11px] font-bold uppercase tracking-[0.14em]">
          {label}
        </span>
      </div>

      <div className="mt-2 break-words text-sm font-medium text-slate-800">
        {value || 'N/A'}
      </div>
    </div>
  );
}

InfoCard.propTypes = {
  icon: PropTypes.object.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.node,
  fullWidth: PropTypes.bool,
};

function ListaTags({ items = [], emptyMessage, renderLabel }) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item.id}
          className="inline-flex rounded-full bg-slate-50 px-3 py-1 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200"
        >
          {renderLabel(item)}
        </span>
      ))}
    </div>
  );
}

ListaTags.propTypes = {
  items: PropTypes.array,
  emptyMessage: PropTypes.string.isRequired,
  renderLabel: PropTypes.func.isRequired,
};

function ListaEquipamentos({ equipamentos = [] }) {
  if (!equipamentos.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Sem equipamentos específicos.
      </div>
    );
  }

  return (
    <div className="flex max-h-[320px] flex-col gap-2 overflow-y-auto pr-1">
      {equipamentos.map((equipamento) => (
        <div
          key={equipamento.id}
          className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
        >
          <span className="text-sm font-medium text-slate-800">
            {equipamento.modelo}
          </span>

          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
            {equipamento.tag || 'N/A'}
          </span>
        </div>
      ))}
    </div>
  );
}

ListaEquipamentos.propTypes = {
  equipamentos: PropTypes.array,
};

function ContratoDetalhesSection({ contrato }) {
  const statusDinamico = getDynamicStatus(contrato);
  const badgeVariant = getStatusBadgeVariant(statusDinamico);

  return (
    <div className="space-y-6">
      <PageSection
        title="Resumo do contrato"
        description="Informações principais de identificação, vigência e status."
        headerRight={<Badge variant={badgeVariant}>{statusDinamico}</Badge>}
      >
        <ResponsiveGrid preset="details">
          <InfoCard
            icon={faFileContract}
            label="Número do contrato"
            value={contrato.numeroContrato}
          />

          <InfoCard
            icon={faCircleInfo}
            label="Categoria"
            value={contrato.categoria}
          />

          <InfoCard
            icon={faBuilding}
            label="Fornecedor"
            value={contrato.fornecedor}
          />

          <InfoCard
            icon={faCalendarDays}
            label="Data de início"
            value={formatarData(contrato.dataInicio)}
          />

          <InfoCard
            icon={faCalendarDays}
            label="Data de fim"
            value={formatarData(contrato.dataFim)}
          />

          <InfoCard
            icon={faCircleInfo}
            label="Status cadastrado"
            value={contrato.status}
          />
        </ResponsiveGrid>
      </PageSection>

      <PageSection
        title="Unidades cobertas"
        description="Unidades vinculadas à cobertura do contrato."
      >
        <ListaTags
          items={contrato.unidadesCobertas || []}
          emptyMessage="Nenhuma unidade vinculada."
          renderLabel={(unidade) => unidade.nomeSistema || unidade.nomeFantasia || 'Unidade'}
        />
      </PageSection>

      <PageSection
        title="Equipamentos cobertos"
        description="Equipamentos específicos vinculados ao contrato."
      >
        <ListaEquipamentos equipamentos={contrato.equipamentosCobertos || []} />
      </PageSection>
    </div>
  );
}

ContratoDetalhesSection.propTypes = {
  contrato: PropTypes.object.isRequired,
};

export default ContratoDetalhesSection;