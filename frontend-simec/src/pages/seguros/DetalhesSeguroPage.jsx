import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { faShieldAlt, faRotate, faPen } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { useDetalhesSeguroPage } from '@/hooks/seguros/useDetalhesSeguroPage';

import {
  PageLayout,
  PageHeader,
  PageSection,
  PageState,
  ResponsiveGrid,
  Button,
} from '@/components/ui';

import { getCoberturasAtivas } from '@/utils/seguros';

import {
  formatarMoeda,
  getNomeUnidade,
  getTipoVinculo,
  getTipoSeguroLabel,
} from '@/utils/seguros/seguroFormatter';

function DetalhesSeguroPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { seguro, loading, error } = useDetalhesSeguroPage(id);

  const coberturas = useMemo(() => {
    return getCoberturasAtivas(seguro || {});
  }, [seguro]);

  if (loading) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader title="Detalhes do Seguro" icon={faShieldAlt} />
        <PageState loading />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title="Erro"
          icon={faShieldAlt}
          actions={
            <Button variant="secondary" onClick={() => navigate('/seguros')}>
              Voltar
            </Button>
          }
        />
        <PageState error={error} />
      </PageLayout>
    );
  }

  if (!seguro) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader title="Não encontrado" icon={faShieldAlt} />
        <PageState isEmpty emptyMessage="Seguro não encontrado." />
      </PageLayout>
    );
  }

  return (
    <PageLayout background="slate" padded fullHeight>
      <PageHeader
        title={`Apólice ${seguro.apoliceNumero}`}
        icon={faShieldAlt}
        actions={
          <div className="flex gap-2">
            {['Ativo', 'Vigente'].includes(seguro.status) && (
              <Button variant="primary" onClick={() => navigate(`/seguros/renovar/${seguro.id}`)}>
                <FontAwesomeIcon icon={faRotate} />
                Renovar
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate(`/seguros/editar/${seguro.id}`)}>
              <FontAwesomeIcon icon={faPen} />
              Editar
            </Button>
            <Button variant="secondary" onClick={() => navigate('/seguros')}>
              Voltar
            </Button>
          </div>
        }
      />

      <PageSection title="Informações">
        <ResponsiveGrid cols={{ base: 1, md: 2, xl: 3 }}>
          <div>{seguro.seguradora}</div>
          <div>{getNomeUnidade(seguro)}</div>
          <div>{getTipoSeguroLabel(seguro.tipoSeguro)}</div>
          <div>{getTipoVinculo(seguro)}</div>
          <div>{formatarMoeda(seguro.premioTotal)}</div>
        </ResponsiveGrid>
      </PageSection>

      <PageSection title="Coberturas">
        {coberturas.length > 0 ? (
          <ResponsiveGrid cols={{ base: 1, md: 2 }}>
            {coberturas.map((cobertura) => (
              <div key={cobertura.key}>
                {cobertura.label} - {formatarMoeda(cobertura.value)}
              </div>
            ))}
          </ResponsiveGrid>
        ) : (
          <PageState isEmpty emptyMessage="Sem coberturas." />
        )}
      </PageSection>
    </PageLayout>
  );
}

export default DetalhesSeguroPage;
