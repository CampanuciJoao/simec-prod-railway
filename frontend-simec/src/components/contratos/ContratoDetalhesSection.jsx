import React from 'react';
import PropTypes from 'prop-types';
import {
  faFileContract,
  faBuilding,
  faCalendarDays,
  faCircleInfo,
} from '@fortawesome/free-solid-svg-icons';

import { PageSection, ResponsiveGrid } from '@/components/ui/layout';
import { Badge } from '@/components/ui/primitives';

import { formatarData } from '@/utils/timeUtils';
import { getDynamicStatus, getStatusBadgeVariant } from '@/utils/contratos';

import ContratoInfoCard from '@/components/contratos/ContratoInfoCard';
import ContratoTagsList from '@/components/contratos/ContratoTagsList';
import ContratoEquipamentosList from '@/components/contratos/ContratoEquipamentosList';

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
          <ContratoInfoCard
            icon={faFileContract}
            label="Número do contrato"
            value={contrato.numeroContrato}
          />

          <ContratoInfoCard
            icon={faCircleInfo}
            label="Categoria"
            value={contrato.categoria}
          />

          <ContratoInfoCard
            icon={faBuilding}
            label="Fornecedor"
            value={contrato.fornecedor}
          />

          <ContratoInfoCard
            icon={faCalendarDays}
            label="Data de início"
            value={formatarData(contrato.dataInicio)}
          />

          <ContratoInfoCard
            icon={faCalendarDays}
            label="Data de fim"
            value={formatarData(contrato.dataFim)}
          />

          <ContratoInfoCard
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
        <ContratoTagsList
          items={contrato.unidadesCobertas || []}
          emptyMessage="Nenhuma unidade vinculada."
          renderLabel={(unidade) =>
            unidade.nomeSistema || unidade.nomeFantasia || 'Unidade'
          }
        />
      </PageSection>

      <PageSection
        title="Equipamentos cobertos"
        description="Equipamentos específicos vinculados ao contrato."
      >
        <ContratoEquipamentosList
          equipamentos={contrato.equipamentosCobertos || []}
        />
      </PageSection>
    </div>
  );
}

ContratoDetalhesSection.propTypes = {
  contrato: PropTypes.object.isRequired,
};

export default ContratoDetalhesSection;