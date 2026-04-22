import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBolt,
  faBuilding,
  faCalendarCheck,
  faMicrochip,
  faPenToSquare,
  faShieldAlt,
  faTriangleExclamation,
  faWrench,
} from '@fortawesome/free-solid-svg-icons';

import {
  Button,
  InfoCard,
  PageSection,
  ResponsiveGrid,
  StatusBadge,
} from '@/components/ui';
import { formatarData } from '@/utils/timeUtils';
import { useEquipamentoCobertura } from '@/hooks/equipamentos/useEquipamentoCobertura';
import { useEquipamentoFichaTecnica } from '@/hooks/equipamentos/useEquipamentoFichaTecnica';

function TabVisaoGeral({ equipamento, editHref }) {
  const { contratosRelacionados, segurosRelacionados } =
    useEquipamentoCobertura(equipamento);
  const { ocorrencias, loading: loadingOcorrencias } =
    useEquipamentoFichaTecnica(equipamento.id);

  const ocorrenciasPendentes = (ocorrencias || []).filter(
    (item) => !item.resolvido
  ).length;

  return (
    <div className="space-y-6">
      <ResponsiveGrid cols={{ base: 1, md: 2, xl: 4 }}>
        <InfoCard
          icon={faBolt}
          label="Status operacional"
          value={<StatusBadge value={equipamento.status || 'N/A'} />}
        />
        <InfoCard
          icon={faBuilding}
          label="Unidade"
          value={equipamento.unidade?.nomeSistema || 'N/A'}
        />
        <InfoCard
          icon={faTriangleExclamation}
          label="Ocorrencias pendentes"
          value={loadingOcorrencias ? '...' : ocorrenciasPendentes}
        />
        <InfoCard
          icon={faShieldAlt}
          label="Cobertura ativa"
          value={`${contratosRelacionados.length} contrato(s) / ${segurosRelacionados.length} seguro(s)`}
        />
      </ResponsiveGrid>

      <PageSection
        title="Resumo do ativo"
        description="Informacoes executivas e operacionais mais relevantes deste equipamento."
      >
        <div className="space-y-5">
          <ResponsiveGrid cols={{ base: 1, md: 2, xl: 3 }}>
            <InfoCard
              icon={faMicrochip}
              label="Modelo"
              value={equipamento.modelo}
            />
            <InfoCard
              icon={faMicrochip}
              label="Tipo"
              value={equipamento.tipo || 'N/A'}
            />
            <InfoCard
              icon={faMicrochip}
              label="Fabricante"
              value={equipamento.fabricante || 'N/A'}
            />
            <InfoCard
              icon={faMicrochip}
              label="Tag"
              value={equipamento.tag || 'N/A'}
            />
            <InfoCard
              icon={faCalendarCheck}
              label="Instalacao"
              value={formatarData(equipamento.dataInstalacao)}
            />
            <InfoCard
              icon={faWrench}
              label="Patrimonio"
              value={equipamento.numeroPatrimonio || 'N/A'}
            />
            <InfoCard
              icon={faMicrochip}
              label="AE Title"
              value={equipamento.aeTitle || 'N/A'}
            />
            <InfoCard
              icon={faWrench}
              label="Suporte tecnico"
              value={equipamento.telefoneSuporte || 'N/A'}
            />
          </ResponsiveGrid>

          <div className="flex justify-start">
            <Link to={editHref}>
              <Button type="button" variant="secondary">
                <FontAwesomeIcon icon={faPenToSquare} />
                Editar cadastro
              </Button>
            </Link>
          </div>
        </div>
      </PageSection>
    </div>
  );
}

TabVisaoGeral.propTypes = {
  equipamento: PropTypes.object.isRequired,
  editHref: PropTypes.string.isRequired,
};

export default TabVisaoGeral;
