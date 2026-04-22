import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileMedical } from '@fortawesome/free-solid-svg-icons';

import { Button, ResponsiveTabs } from '@/components/ui';
import {
  TabAnexos,
  TabCobertura,
  TabFichaTecnica,
  TabHistorico,
  TabVisaoGeral,
} from '@/components/equipamentos/tabs';

const TABS = [
  { id: 'visaoGeral', label: 'Visao geral' },
  { id: 'historico', label: 'Historico' },
  { id: 'fichaTecnica', label: 'Ficha tecnica' },
  { id: 'anexos', label: 'Anexos' },
  { id: 'cobertura', label: 'Cobertura' },
];

function EquipamentoCardExpanded({
  equipamento,
  abaAtiva,
  onChangeTab,
  onRefresh,
}) {
  const tabContentMap = {
    visaoGeral: (
      <TabVisaoGeral
        equipamento={equipamento}
        editHref={`/equipamentos/editar/${equipamento.id}`}
      />
    ),
    fichaTecnica: <TabFichaTecnica equipamentoId={equipamento.id} />,
    anexos: (
      <TabAnexos
        equipamentoId={equipamento.id}
        anexosIniciais={equipamento.anexos || []}
        onUpdate={onRefresh}
      />
    ),
    historico: <TabHistorico equipamento={equipamento} />,
    cobertura: <TabCobertura equipamento={equipamento} />,
  };

  return (
    <div
      className="space-y-5 border-t px-4 py-5 md:px-6 md:py-6"
      style={{
        borderColor: 'var(--section-header-border)',
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      <div
        className="rounded-3xl border px-4 py-4 md:px-5"
        style={{
          borderColor: 'var(--border-soft)',
          backgroundColor: 'var(--bg-surface-soft)',
        }}
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: 'var(--text-muted)' }}
            >
              Workspace do ativo
            </p>
            <h4
              className="mt-1 text-lg font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              {equipamento.modelo}
            </h4>
            <div
              className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              <span>Tag: {equipamento.tag || 'N/A'}</span>
              <span>Tipo: {equipamento.tipo || 'N/A'}</span>
              <span>Unidade: {equipamento.unidade?.nomeSistema || 'N/A'}</span>
              <span>Fabricante: {equipamento.fabricante || 'N/A'}</span>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={() => onChangeTab(equipamento.id, 'fichaTecnica')}
          >
            <FontAwesomeIcon icon={faFileMedical} />
            Ficha tecnica
          </Button>
        </div>
      </div>

      <ResponsiveTabs
        tabs={TABS}
        activeTab={abaAtiva}
        onChange={(tabId) => onChangeTab(equipamento.id, tabId)}
      />

      <div
        className="min-h-[260px] rounded-3xl border p-4 md:p-5"
        style={{
          backgroundColor: 'var(--bg-surface-soft)',
          borderColor: 'var(--border-soft)',
          color: 'var(--text-primary)',
        }}
      >
        {tabContentMap[abaAtiva] || null}
      </div>
    </div>
  );
}

EquipamentoCardExpanded.propTypes = {
  equipamento: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    anexos: PropTypes.array,
  }).isRequired,
  abaAtiva: PropTypes.string.isRequired,
  onChangeTab: PropTypes.func.isRequired,
  onRefresh: PropTypes.func,
};

export default EquipamentoCardExpanded;
