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
    { key: 'tag', label: 'Nº Série (Tag)', value: equipamentoInicial.tag },
    { key: 'tipo', label: 'Tipo', value: equipamentoInicial.tipo },
    { key: 'setor', label: 'Localização', value: equipamentoInicial.setor },
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
      label: 'Ano Fabricação',
      value: equipamentoInicial.anoFabricacao,
    },
    {
      key: 'instalacao',
      label: 'Data Instalação',
      value: formatarData(equipamentoInicial.dataInstalacao),
    },
    {
      key: 'patrimonio',
      label: 'Nº de Patrimônio',
      value: equipamentoInicial.numeroPatrimonio,
    },
    {
      key: 'anvisa',
      label: 'Registro ANVISA',
      value: equipamentoInicial.registroAnvisa,
    },
    {
      key: 'observacoes',
      label: 'Observações',
      value: equipamentoInicial.observacoes,
      fullWidth: true,
    },
  ];

  return (
    <PageSection
      title="Informações do Cadastro"
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
              Informações administrativas e técnicas do equipamento.
            </p>
          </div>
        </div>

        <ActionBar
          right={
            <Button
              type="button"
              onClick={() =>
                navigate(`/cadastros/equipamentos/editar/${equipamentoInicial.id}`)
              }
            >
              <FontAwesomeIcon icon={faEdit} />
              Editar
            </Button>
          }
        />

        <EntityInfoGrid items={items} />
      </div>
    </PageSection>
  );
}

export default TabCadastro;