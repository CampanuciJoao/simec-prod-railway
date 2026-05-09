import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrashAlt } from '@fortawesome/free-solid-svg-icons';

import { Button, Card } from '@/components/ui';
import TelegramStatusIcon from './TelegramStatusIcon';

const COLUNAS = [
  { key: 'recebeAlertasContrato',     label: 'Contratos' },
  { key: 'recebeAlertasManutencao',   label: 'Manutenções' },
  { key: 'recebeAlertasSeguro',       label: 'Seguros' },
  { key: 'recebeAlertasGehc',         label: 'GEHC' },
  { key: 'recebeAlertasOsCorretiva',  label: 'OS Corretiva' },
  { key: 'recebeAlertasRecomendacao', label: 'Recomendações' },
];

function TelegramTable({ destinatarios, onEdit, onDelete }) {
  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" padded>
        <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          {destinatarios.length} destinatário(s) cadastrado(s)
        </span>
      </Card>

      <Card padded={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr
                className="text-left text-xs font-semibold uppercase tracking-wide"
                style={{
                  backgroundColor: 'var(--bg-surface-soft)',
                  borderBottom: '1px solid var(--border-soft)',
                  color: 'var(--text-muted)',
                }}
              >
                <th className="px-4 py-3">Nome / Chat</th>
                <th className="px-4 py-3">Chat ID</th>
                <th className="px-4 py-3 text-center">Status</th>
                {COLUNAS.map((c) => (
                  <th key={c.key} className="px-4 py-3 text-center">{c.label}</th>
                ))}
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>

            <tbody>
              {destinatarios.map((dest) => (
                <tr
                  key={dest.id}
                  style={{ borderBottom: '1px solid var(--border-soft)' }}
                  className="transition-colors hover:bg-black/5"
                >
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {dest.nome || <span className="italic" style={{ color: 'var(--text-muted)' }}>Sem nome</span>}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
                    {dest.chatId}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={[
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                      dest.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500',
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
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onEdit(dest)}
                        title="Editar"
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => onDelete(dest)}
                        title="Remover"
                      >
                        <FontAwesomeIcon icon={faTrashAlt} />
                      </Button>
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
