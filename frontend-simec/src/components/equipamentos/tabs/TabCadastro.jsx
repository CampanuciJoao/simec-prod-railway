import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle, faEdit } from '@fortawesome/free-solid-svg-icons';

import { EntityInfoGrid, ActionBar } from '../@/components/ui/layout';
import PageSection from '../../ui/PageSection';
import { formatarData } from '../../../utils/timeUtils';

function getStatusBadgeClass(status) {
  const normalized = String(status || '').toLowerCase();

  if (normalized === 'operante') return 'badge badge-green';
  if (normalized === 'inoperante') return 'badge badge-red';
  if (normalized === 'emmanutencao') return 'badge badge-yellow';
  if (normalized === 'usolimitado') return 'badge badge-blue';

  return 'badge badge-slate';
}

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
      value: (
        <span className={getStatusBadgeClass(equipamentoInicial.status)}>
          {equipamentoInicial.status || 'N/A'}
        </span>
      ),
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
      description="Dados principais do equipamento cadastrado no sistema"
    >
      <div className="mb-5 flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <FontAwesomeIcon icon={faInfoCircle} />
        </span>

        <div>
          <p className="text-sm font-semibold text-slate-900">
            Cadastro principal do ativo
          </p>
          <p className="text-sm text-slate-500">
            Informações administrativas e técnicas do equipamento
          </p>
        </div>
      </div>

      <ActionBar
        className="mb-5"
        right={
          <button
            type="button"
            className="btn btn-primary w-full sm:w-auto"
            onClick={() =>
              navigate(`/cadastros/equipamentos/editar/${equipamentoInicial.id}`)
            }
          >
            <FontAwesomeIcon icon={faEdit} />
            <span>Editar</span>
          </button>
        }
      />

      <EntityInfoGrid items={items} />
    </PageSection>
  );
}

export default TabCadastro;