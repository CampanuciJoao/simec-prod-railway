import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faEdit,
  faTrashAlt,
} from '@fortawesome/free-solid-svg-icons';

import { Button, Card } from '@/components/ui';
import EmailStatusIcon from '@/components/emails/EmailStatusIcon';

function EmailsTable({ emails, onCreate, onEdit, onDelete }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-medium text-slate-600">
          {emails.length} e-mail(s) cadastrado(s)
        </span>

        <Button type="button" onClick={onCreate}>
          <FontAwesomeIcon icon={faPlus} />
          Adicionar E-mail
        </Button>
      </div>

      <Card padded={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3 text-center">Dias Antec.</th>
                <th className="px-4 py-3 text-center">Contratos</th>
                <th className="px-4 py-3 text-center">Manutenções</th>
                <th className="px-4 py-3 text-center">Seguros</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {emails.map((email) => (
                <tr key={email.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-800">
                    {email.nome || '-'}
                  </td>

                  <td className="px-4 py-3 text-sm text-slate-800">
                    {email.email}
                  </td>

                  <td className="px-4 py-3 text-center text-sm text-slate-700">
                    {email.diasAntecedencia}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <EmailStatusIcon ativo={email.recebeAlertasContrato} />
                  </td>

                  <td className="px-4 py-3 text-center">
                    <EmailStatusIcon ativo={email.recebeAlertasManutencao} />
                  </td>

                  <td className="px-4 py-3 text-center">
                    <EmailStatusIcon ativo={email.recebeAlertasSeguro} />
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onEdit(email)}
                        title="Editar configurações"
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => onDelete(email)}
                        title="Remover e-mail"
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

EmailsTable.propTypes = {
  emails: PropTypes.arrayOf(PropTypes.object).isRequired,
  onCreate: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default EmailsTable;
