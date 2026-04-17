import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faMinus,
  faFileMedical,
} from '@fortawesome/free-solid-svg-icons';

import { StatusSelector } from '@/components/equipamentos';
import {
  Button,
  Card,
  ResponsiveGrid,
} from '@/components/ui';
import EquipamentoCardExpanded from '@/components/equipamentos/EquipamentoCardExpanded';
import { getEquipamentoCardStyles } from '@/utils/equipamentoCardStyles';

function InfoField({ label, value, valueClassName = '' }) {
  return (
    <div
      className="rounded-xl border px-4 py-3"
      style={{
        backgroundColor: 'var(--bg-surface-soft)',
        borderColor: 'var(--border-soft)',
      }}
    >
      <span
        className="block text-[11px] font-semibold uppercase tracking-[0.14em]"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </span>

      <span
        className={[
          'mt-2 block min-w-0 break-words text-sm',
          valueClassName,
        ].join(' ')}
        style={{ color: 'var(--text-primary)' }}
      >
        {value || '—'}
      </span>
    </div>
  );
}

function EquipamentoCard({
  equipamento,
  isAberto,
  abaAtiva,
  onToggleExpandir,
  onTrocarAba,
  onGoToFichaTecnica,
  onStatusUpdated,
  onRefresh,
}) {
  const { borderClass, backgroundClass } = getEquipamentoCardStyles(
    equipamento.status
  );

  const handleToggle = () => {
    onToggleExpandir(equipamento.id);
  };

  const handleGoToFicha = (event) => {
    event.stopPropagation();
    onGoToFichaTecnica(equipamento.id);
  };

  const stopPropagation = (event) => {
    event.stopPropagation();
  };

  return (
    <Card
      padded={false}
      className={[
        'overflow-hidden rounded-3xl border border-l-[8px] shadow-sm transition-all',
        borderClass,
      ].join(' ')}
      surface="default"
      styleOverride={{
        backgroundColor: 'var(--section-surface)',
        borderColor: 'var(--border-soft)',
      }}
    >
      <button
        type="button"
        onClick={handleToggle}
        className={[
          'flex w-full flex-col gap-5 px-5 py-5 text-left transition-colors',
          'lg:flex-row lg:items-start lg:justify-between',
          backgroundClass,
        ].join(' ')}
        style={{
          color: 'inherit',
        }}
      >
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border"
            style={{
              backgroundColor: 'var(--bg-surface-soft)',
              borderColor: 'var(--border-soft)',
              color: 'var(--brand-primary)',
            }}
          >
            <FontAwesomeIcon icon={isAberto ? faMinus : faPlus} />
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div
                  className="text-[11px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Equipamento
                </div>

                <h3
                  className="mt-1 break-words text-lg font-bold sm:text-xl"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {equipamento.modelo || 'Equipamento sem modelo'}
                </h3>

                <p
                  className="mt-1 text-sm"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Clique para {isAberto ? 'recolher' : 'expandir'} os detalhes
                </p>
              </div>

              <div
                className="flex shrink-0 items-center gap-2"
                onClick={stopPropagation}
              >
                <Button
                  type="button"
                  variant="secondary"
                  title="Abrir ficha técnica"
                  onClick={handleGoToFicha}
                >
                  <FontAwesomeIcon icon={faFileMedical} />
                  <span className="hidden sm:inline">Ficha técnica</span>
                </Button>
              </div>
            </div>

            <ResponsiveGrid preset="details" className="gap-3">
              <InfoField
                label="Modelo"
                value={equipamento.modelo}
                valueClassName="font-semibold"
              />

              <InfoField
                label="Nº Série / Tag"
                value={equipamento.tag}
                valueClassName="font-semibold"
              />

              <InfoField
                label="Tipo"
                value={equipamento.tipo}
              />

              <InfoField
                label="Unidade"
                value={equipamento.unidade?.nomeSistema}
              />

              <div
                className="rounded-xl border px-4 py-3"
                style={{
                  backgroundColor: 'var(--bg-surface-soft)',
                  borderColor: 'var(--border-soft)',
                }}
                onClick={stopPropagation}
              >
                <span
                  className="block text-[11px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Status atual
                </span>

                <div className="mt-2">
                  <StatusSelector
                    equipamento={equipamento}
                    onSuccessUpdate={onStatusUpdated}
                  />
                </div>
              </div>
            </ResponsiveGrid>
          </div>
        </div>
      </button>

      {isAberto ? (
        <div
          className="border-t"
          style={{
            borderColor: 'var(--section-header-border)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <EquipamentoCardExpanded
            equipamento={equipamento}
            abaAtiva={abaAtiva}
            onChangeTab={onTrocarAba}
            onRefresh={onRefresh}
          />
        </div>
      ) : null}
    </Card>
  );
}

InfoField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  valueClassName: PropTypes.string,
};

EquipamentoCard.propTypes = {
  equipamento: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    modelo: PropTypes.string,
    tag: PropTypes.string,
    tipo: PropTypes.string,
    status: PropTypes.string,
    unidade: PropTypes.shape({
      nomeSistema: PropTypes.string,
    }),
  }).isRequired,
  isAberto: PropTypes.bool.isRequired,
  abaAtiva: PropTypes.string,
  onToggleExpandir: PropTypes.func.isRequired,
  onTrocarAba: PropTypes.func.isRequired,
  onGoToFichaTecnica: PropTypes.func.isRequired,
  onStatusUpdated: PropTypes.func,
  onRefresh: PropTypes.func,
};

export default EquipamentoCard;