import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faTrashAlt,
  faEdit,
} from '@fortawesome/free-solid-svg-icons';

import Button from '@/components/ui/primitives/Button';
import Card from '@/components/ui/primitives/Card';
import RoleBadge from '@/components/gerenciamento/RoleBadge';

function UsuariosTable({
  usuarios,
  usuarioLogadoId,
  onCreate,
  onEdit,
  onAskDelete,
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-medium text-slate-600">
          {usuarios.length} usuário(s) encontrado(s)
        </span>

        <Button type="button" onClick={onCreate}>
          <FontAwesomeIcon icon={faPlus} />
          Novo Usuário
        </Button>
      </div>

      <Card padded={false} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Nome Completo</th>
                <th className="px-4 py-3">Nome de Usuário (Login)</th>
                <th className="px-4 py-3">Função (Role)</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {usuarios.map((user) => {
                const isSelf = usuarioLogadoId === user.id;

                return (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">
                      {user.nome}
                    </td>

                    <td className="px-4 py-3 text-sm text-slate-700">
                      {user.username}
                    </td>

                    <td className="px-4 py-3">
                      <RoleBadge role={user.role} />
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          title="Editar Usuário"
                          onClick={() => onEdit(user)}
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          title={
                            isSelf
                              ? 'Não é possível excluir a si mesmo'
                              : 'Excluir Usuário'
                          }
                          onClick={() => onAskDelete(user)}
                          disabled={isSelf}
                        >
                          <FontAwesomeIcon icon={faTrashAlt} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

UsuariosTable.propTypes = {
  usuarios: PropTypes.arrayOf(PropTypes.object).isRequired,
  usuarioLogadoId: PropTypes.string,
  onCreate: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onAskDelete: PropTypes.func.isRequired,
};

export default UsuariosTable;