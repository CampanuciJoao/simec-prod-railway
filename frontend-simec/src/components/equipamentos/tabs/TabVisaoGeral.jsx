import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBolt,
  faBuilding,
  faCalendarCheck,
  faFileMedical,
  faFilePdf,
  faMicrochip,
  faPenToSquare,
  faShieldAlt,
  faTimeline,
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

function TabVisaoGeral({
  equipamento,
  onNavigateTab,
  editHref,
}) {
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

      <ResponsiveGrid cols={{ base: 1, xl: 2 }}>
        <PageSection
          title="Resumo do ativo"
          description="Informacoes executivas e operacionais mais relevantes deste equipamento."
        >
          <ResponsiveGrid cols={{ base: 1, md: 2 }}>
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
          </ResponsiveGrid>
        </PageSection>

        <PageSection
          title="Acoes rapidas"
          description="Atalhos operacionais para o dia a dia do ativo."
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Button type="button" onClick={() => onNavigateTab('historico')}>
              <FontAwesomeIcon icon={faTimeline} />
              Ver historico completo
            </Button>

            <Button type="button" onClick={() => onNavigateTab('fichaTecnica')}>
              <FontAwesomeIcon icon={faFileMedical} />
              Registrar ocorrencia
            </Button>

            <Link to={`/equipamentos/detalhes/${equipamento.id}`}>
              <Button type="button" variant="secondary" className="w-full">
                <FontAwesomeIcon icon={faWrench} />
                Abrir detalhe completo
              </Button>
            </Link>

            <Link to={editHref}>
              <Button type="button" variant="secondary" className="w-full">
                <FontAwesomeIcon icon={faPenToSquare} />
                Editar cadastro
              </Button>
            </Link>

            <Button type="button" variant="secondary" onClick={() => onNavigateTab('cobertura')}>
              <FontAwesomeIcon icon={faShieldAlt} />
              Ver cobertura
            </Button>

            <Link to="/relatorios">
              <Button type="button" variant="secondary" className="w-full">
                <FontAwesomeIcon icon={faFilePdf} />
                Relatorios do modulo
              </Button>
            </Link>
          </div>
        </PageSection>
      </ResponsiveGrid>
    </div>
  );
}

TabVisaoGeral.propTypes = {
  equipamento: PropTypes.object.isRequired,
  onNavigateTab: PropTypes.func.isRequired,
  editHref: PropTypes.string.isRequired,
};

export default TabVisaoGeral;
