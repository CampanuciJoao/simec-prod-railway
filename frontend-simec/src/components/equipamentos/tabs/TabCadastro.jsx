import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfoCircle, faEdit } from '@fortawesome/free-solid-svg-icons';
import { formatarData } from '../../../utils/timeUtils';

function getStatusBadgeClass(status) {
  const normalized = String(status || '').toLowerCase();

  if (normalized === 'operante') return 'badge badge-green';
  if (normalized === 'inoperante') return 'badge badge-red';
  if (normalized === 'emmanutencao') return 'badge badge-yellow';
  if (normalized === 'usolimitado') return 'badge badge-blue';

  return 'badge badge-slate';
}

function InfoItem({ label, value, fullWidth = false }) {
  return (
    <div
      className={[
        'rounded-xl border border-slate-200 bg-white p-4 shadow-sm',
        fullWidth ? 'md:col-span-2 xl:col-span-3' : '',
      ].join(' ')}
    >
      <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </span>
      <div className="mt-2 text-sm font-medium text-slate-800 break-words">
        {value || 'N/A'}
      </div>
    </div>
  );
}

function TabCadastro({ equipamentoInicial }) {
  const navigate = useNavigate();

  const handleEditClick = () => {
    navigate(`/cadastros/equipamentos/editar/${equipamentoInicial.id}`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <FontAwesomeIcon icon={faInfoCircle} />
          </span>

          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Informações do Cadastro
            </h3>
            <p className="text-sm text-slate-500">
              Dados principais do equipamento cadastrado no sistema
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleEditClick}
        >
          <FontAwesomeIcon icon={faEdit} />
          <span>Editar</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <InfoItem label="Modelo" value={equipamentoInicial.modelo} />
        <InfoItem label="Nº Série (Tag)" value={equipamentoInicial.tag} />
        <InfoItem label="Tipo" value={equipamentoInicial.tipo} />
        <InfoItem label="Localização" value={equipamentoInicial.setor} />
        <InfoItem
          label="Unidade"
          value={equipamentoInicial.unidade?.nomeSistema}
        />

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Status
          </span>
          <div className="mt-2">
            <span className={getStatusBadgeClass(equipamentoInicial.status)}>
              {equipamentoInicial.status || 'N/A'}
            </span>
          </div>
        </div>

        <InfoItem label="Fabricante" value={equipamentoInicial.fabricante} />
        <InfoItem
          label="Ano Fabricação"
          value={equipamentoInicial.anoFabricacao}
        />
        <InfoItem
          label="Data Instalação"
          value={formatarData(equipamentoInicial.dataInstalacao)}
        />
        <InfoItem
          label="Nº de Patrimônio"
          value={equipamentoInicial.numeroPatrimonio}
        />
        <InfoItem
          label="Registro ANVISA"
          value={equipamentoInicial.registroAnvisa}
        />

        <InfoItem
          label="Observações"
          value={equipamentoInicial.observacoes}
          fullWidth
        />
      </div>
    </div>
  );
}

export default TabCadastro;