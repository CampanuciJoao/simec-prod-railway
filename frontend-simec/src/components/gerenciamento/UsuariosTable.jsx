import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faTrashAlt,
  faEdit,
} from '@fortawesome/free-solid-svg-icons';

import { Button, Card, ListToolbar } from '@/components/ui';
import { RoleBadge } from '@/components/shared';

function UsuariosTable({
  usuarios,
  usuarioLogadoId,
  onCreate,
  onEdit,
  onAskDelete,
}) {
  return (
    <div className="space-y-4">
      <ListToolbar
        countLabel={`${usuarios.length} usuario(s) encontrado(s)`}
        actions={
          <Button type="button" onClick={onCreate}>
            <FontAwesomeIcon icon={faPlus} />
            Novo usuario
          </Button>
        }
      />

      <Card padded={false} className="overflow-hidden rounded-3xl">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead
              style={{
                backgroundColor: 'var(--bg-surface-soft)',
                borderBottom: '1px solid var(--border-soft)',
              }}
            >
              <tr
                className="text-left text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--text-muted)' }}
              >
                <th className="px-4 py-3">Nome completo</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Perfil</th>
                <th className="px-4 py-3 text-center">Acoes</th>
              </tr>
            </thead>

            <tbody style={{ backgroundColor: 'var(--bg-surface)' }}>
              {usuarios.map((user) => {
                const isSelf = usuarioLogadoId === user.id;

                return (
                  <tr
                    key={user.id}
                    style={{
                      borderBottom: '1px solid var(--border-soft)',
                    }}
                  >
                    <td
                      className="px-4 py-3 text-sm font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {user.nome}
                    </td>

                    <td
                      className="px-4 py-3 text-sm"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {user.email || '-'}
                    </td>

                    <td
                      className="px-4 py-3 text-sm"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {user.username}
                    </td>

                    <td className="px-4 py-3">
                      <RoleBadge role={user.role} />
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          title="Editar usuario"
                          onClick={() => onEdit(user)}
                          className="px-3"
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </Button>

                        <Button
                          type="button"
                          variant="danger"
                          title={
                            isSelf
                              ? 'Nao e possivel excluir a si mesmo'
                              : 'Excluir usuario'
                          }
                          onClick={() => onAskDelete(user)}
                          disabled={isSelf}
                          className="px-3"
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
