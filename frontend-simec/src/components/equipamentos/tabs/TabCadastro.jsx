import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle, faEdit } from '@fortawesome/free-solid-svg-icons';

import { formatarData } from '@/utils/timeUtils';

import {
  ActionBar,
  Button,
  EntityInfoGrid,
  PageSection,
  StatusBadge,
} from '@/components/ui';

function TabCadastro({ equipamentoInicial }) {
  const navigate = useNavigate();

  const items = [
    { key: 'modelo', label: 'Modelo', value: equipamentoInicial.modelo },
    { key: 'tag', label: 'Numero de serie (Tag)', value: equipamentoInicial.tag },
    { key: 'tipo', label: 'Tipo', value: equipamentoInicial.tipo },
    { key: 'setor', label: 'Localizacao', value: equipamentoInicial.setor },
    {
      key: 'unidade',
      label: 'Unidade',
      value: equipamentoInicial.unidade?.nomeSistema,
    },
    {
      key: 'status',
      label: 'Status',
      value: <StatusBadge value={equipamentoInicial.status || 'N/A'} />,
    },
    {
      key: 'fabricante',
      label: 'Fabricante',
      value: equipamentoInicial.fabricante,
    },
    {
      key: 'ano',
      label: 'Ano fabricacao',
      value: equipamentoInicial.anoFabricacao,
    },
    {
      key: 'instalacao',
      label: 'Data instalacao',
      value: formatarData(equipamentoInicial.dataInstalacao),
    },
    {
      key: 'patrimonio',
      label: 'Numero de patrimonio',
      value: equipamentoInicial.numeroPatrimonio,
    },
    {
      key: 'anvisa',
      label: 'Registro ANVISA',
      value: equipamentoInicial.registroAnvisa,
    },
    {
      key: 'observacoes',
      label: 'Observacoes',
      value: equipamentoInicial.observacoes,
      fullWidth: true,
    },
  ];

  return (
    <PageSection
      title="Informacoes do Cadastro"
      description="Dados principais do equipamento cadastrado no sistema."
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <span
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
            style={{
              backgroundColor: 'var(--brand-primary-soft)',
              color: 'var(--brand-primary)',
            }}
          >
            <FontAwesomeIcon icon={faInfoCircle} />
          </span>

          <div className="min-w-0">
            <p
              className="text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Cadastro principal do ativo
            </p>
            <p
              className="text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              Informacoes administrativas e tecnicas do equipamento.
            </p>
          </div>
        </div>

        <ActionBar
          right={(
            <Button
              type="button"
              size="sm"
              onClick={() => navigate(`/equipamentos/editar/${equipamentoInicial.id}`)}
            >
              <FontAwesomeIcon icon={faEdit} />
              Editar cadastro
            </Button>
          )}
        />

        <EntityInfoGrid items={items} />
      </div>
    </PageSection>
  );
}

export default TabCadastro;
