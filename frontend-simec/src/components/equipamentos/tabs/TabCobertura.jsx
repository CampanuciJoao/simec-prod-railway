import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFileContract,
  faShieldAlt,
  faArrowRight,
  faCircleInfo,
} from '@fortawesome/free-solid-svg-icons';

import {
  Button,
  InfoCard,
  InlineEmptyState,
  LoadingState,
  PageSection,
  ResponsiveGrid,
  StatusBadge,
} from '@/components/ui';
import { useEquipamentoCobertura } from '@/hooks/equipamentos/useEquipamentoCobertura';
import { getDynamicStatus } from '@/utils/contratos';
import {
  formatarMoeda,
  getNomeUnidade,
  getTipoSeguroLabel,
} from '@/utils/seguros/seguroFormatter';
import { getStatusDinamicoSeguro } from '@/hooks/seguros/useSeguros';

function TabCobertura({ equipamento }) {
  const {
    contratosRelacionados,
    segurosRelacionados,
    loading,
  } = useEquipamentoCobertura(equipamento);

  if (loading) {
    return <LoadingState message="Carregando cobertura..." />;
  }

  return (
    <div className="space-y-6">
      <ResponsiveGrid cols={{ base: 1, md: 2, xl: 4 }}>
        <InfoCard
          icon={faFileContract}
          label="Contratos relacionados"
          value={contratosRelacionados.length}
        />
        <InfoCard
          icon={faShieldAlt}
          label="Seguros relacionados"
          value={segurosRelacionados.length}
        />
        <InfoCard
          icon={faFileContract}
          label="Contratos ativos"
          value={
            contratosRelacionados.filter(
              (item) => getDynamicStatus(item) === 'Ativo'
            ).length
          }
        />
        <InfoCard
          icon={faShieldAlt}
          label="Seguros ativos"
          value={
            segurosRelacionados.filter(
              (item) => getStatusDinamicoSeguro(item) === 'Ativo'
            ).length
          }
        />
      </ResponsiveGrid>

      <ResponsiveGrid cols={{ base: 1, xl: 2 }}>
        <PageSection
          title={`Contratos (${contratosRelacionados.length})`}
          description="Coberturas contratuais relacionadas a este equipamento ou a unidade dele."
        >
          {contratosRelacionados.length === 0 ? (
            <InlineEmptyState message="Nenhum contrato relacionado encontrado." />
          ) : (
            <div className="space-y-3">
              {contratosRelacionados.map((contrato) => (
                <div
                  key={contrato.id}
                  className="rounded-2xl border px-4 py-4"
                  style={{
                    borderColor: 'var(--border-soft)',
                    backgroundColor: 'var(--bg-surface-soft)',
                  }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className="text-sm font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {contrato.numeroContrato || 'Contrato sem numero'}
                      </p>
                      <p
                        className="mt-1 text-sm"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {contrato.fornecedor || 'Fornecedor nao informado'}
                      </p>
                    </div>

                    <StatusBadge value={getDynamicStatus(contrato)} />
                  </div>

                  <div
                    className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <span>Categoria: {contrato.categoria || 'N/A'}</span>
                    <span>
                      Vigencia: {contrato.dataInicio || 'N/A'} ate{' '}
                      {contrato.dataFim || 'N/A'}
                    </span>
                    <span>
                      Equipamentos cobertos:{' '}
                      {contrato.equipamentosCobertos?.length || 0}
                    </span>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Link to={`/contratos/detalhes/${contrato.id}`}>
                      <Button type="button" variant="secondary">
                        <FontAwesomeIcon icon={faArrowRight} />
                        Abrir contrato
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PageSection>

        <PageSection
          title={`Seguros (${segurosRelacionados.length})`}
          description="Apolices vinculadas diretamente ao equipamento ou a sua unidade."
        >
          {segurosRelacionados.length === 0 ? (
            <InlineEmptyState message="Nenhum seguro relacionado encontrado." />
          ) : (
            <div className="space-y-3">
              {segurosRelacionados.map((seguro) => (
                <div
                  key={seguro.id}
                  className="rounded-2xl border px-4 py-4"
                  style={{
                    borderColor: 'var(--border-soft)',
                    backgroundColor: 'var(--bg-surface-soft)',
                  }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className="text-sm font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        Apolice {seguro.apoliceNumero || 'N/A'}
                      </p>
                      <p
                        className="mt-1 text-sm"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {seguro.seguradora || 'Seguradora nao informada'}
                      </p>
                    </div>

                    <StatusBadge value={getStatusDinamicoSeguro(seguro)} />
                  </div>

                  <div
                    className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <span>Tipo: {getTipoSeguroLabel(seguro.tipoSeguro)}</span>
                    <span>Unidade: {getNomeUnidade(seguro)}</span>
                    <span>Premio: {formatarMoeda(seguro.premioTotal)}</span>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Link to={`/seguros/detalhes/${seguro.id}`}>
                      <Button type="button" variant="secondary">
                        <FontAwesomeIcon icon={faArrowRight} />
                        Abrir apolice
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PageSection>
      </ResponsiveGrid>

      {contratosRelacionados.length === 0 && segurosRelacionados.length === 0 ? (
        <div
          className="flex items-start gap-3 rounded-2xl border px-4 py-4"
          style={{
            borderColor: 'var(--border-soft)',
            backgroundColor: 'var(--bg-surface-soft)',
          }}
        >
          <span
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: 'var(--brand-primary-soft)',
              color: 'var(--brand-primary)',
            }}
          >
            <FontAwesomeIcon icon={faCircleInfo} />
          </span>

          <div className="min-w-0">
            <p
              className="text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Sem cobertura vinculada no momento
            </p>
            <p
              className="text-sm leading-6"
              style={{ color: 'var(--text-muted)' }}
            >
              Esta aba usa os contratos e seguros ja cadastrados no sistema,
              relacionados ao equipamento ou a unidade associada a ele.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

TabCobertura.propTypes = {
  equipamento: PropTypes.object.isRequired,
};

export default TabCobertura;
