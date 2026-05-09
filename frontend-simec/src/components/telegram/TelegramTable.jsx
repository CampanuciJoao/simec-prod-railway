import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrashAlt } from '@fortawesome/free-solid-svg-icons';

import { Card } from '@/components/ui';
import TelegramStatusIcon from './TelegramStatusIcon';

const COLUNAS = [
  { key: 'recebeAlertasContrato',    label: 'Contratos' },
  { key: 'recebeAlertasManutencao',  label: 'Manutenções' },
  { key: 'recebeAlertasSeguro',      label: 'Seguros' },
  { key: 'recebeAlertasGehc',        label: 'GEHC' },
  { key: 'recebeAlertasOsCorretiva', label: 'OS Corretiva' },
  { key: 'recebeAlertasRecomendacao',label: 'Recomendações' },
];

function TelegramTable({ destinatarios, onEdit, onDelete }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-medium text-slate-600">
          {destinatarios.length} destinatário(s) cadastrado(s)
        </span>
      </div>

      <Card padded={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Nome / Chat</th>
                <th className="px-4 py-3">Chat ID</th>
                <th className="px-4 py-3 text-center">Status</th>
                {COLUNAS.map((c) => (
                  <th key={c.key} className="px-4 py-3 text-center">{c.label}</th>
                ))}
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {destinatarios.map((dest) => (
                <tr key={dest.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">
                    {dest.nome || <span className="text-slate-400 italic">Sem nome</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {dest.chatId}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={[
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                      dest.ativo
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-500',
                    ].join(' ')}>
                      {dest.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  {COLUNAS.map((c) => (
                    <td key={c.key} className="px-4 py-3 text-center">
                      <TelegramStatusIcon ativo={Boolean(dest[c.key])} />
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(dest)}
                        title="Editar"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:border-slate-300"
                      >
                        <FontAwesomeIcon icon={faEdit} />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(dest)}
                        title="Remover"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 hover:border-red-300"
                      >
                        <FontAwesomeIcon icon={faTrashAlt} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

TelegramTable.propTypes = {
  destinatarios: PropTypes.arrayOf(PropTypes.object).isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default TelegramTable;
