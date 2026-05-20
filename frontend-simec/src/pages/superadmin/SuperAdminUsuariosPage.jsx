import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsers,
  faKey,
  faRotate,
  faShieldHalved,
} from '@fortawesome/free-solid-svg-icons';

import {
  Badge,
  Button,
  PageSection,
  PageState,
  Select,
  Input,
  ModalConfirmacao,
} from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import { useUsuariosCrossTenant } from '@/hooks/superadmin/useUsuariosCrossTenant';

const ROLE_OPTIONS = [
  { value: '', label: 'Todos os papéis' },
  { value: 'superadmin', label: 'superadmin' },
  { value: 'admin', label: 'admin' },
  { value: 'user', label: 'user' },
];

function formatarData(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

function SuperAdminUsuariosPage() {
  const { addToast } = useToast();
  const {
    items,
    total,
    tenants,
    loading,
    error,
    page,
    pageSize,
    filtros,
    setFiltro,
    setPage,
    resetarSenha,
    resetandoId,
    recarregar,
  } = useUsuariosCrossTenant();

  const [resetModal, setResetModal] = useState(null);

  const handleConfirmReset = async () => {
    if (!resetModal?.id) return;
    try {
      const r = await resetarSenha(resetModal.id);
      addToast(
        r?.mensagem || 'Link de redefinição enviado por e-mail.',
        'success'
      );
    } catch (e) {
      addToast(
        e?.response?.data?.message || 'Erro ao gerar reset.',
        'error'
      );
    } finally {
      setResetModal(null);
    }
  };

  const totalPaginas = Math.max(1, Math.ceil((total || 0) / pageSize));

  return (
    <>
      <ModalConfirmacao
        isOpen={!!resetModal}
        onClose={() => setResetModal(null)}
        onConfirm={handleConfirmReset}
        title="Gerar reset de senha"
        message={
          resetModal
            ? `Enviar link de redefinição para ${resetModal.email}? Ação registrada no log_admin.`
            : ''
        }
        confirmText="Enviar link"
      />

      <PageSection
        title="Usuários cross-tenant"
        description="Busca global por usuários de todos os tenants. Use para suporte (reset de senha por e-mail) ou auditoria pontual."
        icon={faUsers}
        headerRight={
          <Button type="button" variant="secondary" size="sm" onClick={recarregar}>
            <FontAwesomeIcon icon={faRotate} />
            <span className="ml-2">Atualizar</span>
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input
            label="Buscar"
            placeholder="Nome, username ou e-mail"
            value={filtros.search}
            onChange={(e) => setFiltro('search', e.target.value)}
          />
          <Select
            label="Tenant"
            value={filtros.tenantId}
            onChange={(e) => setFiltro('tenantId', e.target.value)}
            options={[
              { value: '', label: 'Todos os tenants' },
              ...tenants.map((t) => ({
                value: t.id,
                label: `${t.nome}${t.kind === 'SYSTEM' ? ' (SYSTEM)' : ''}`,
              })),
            ]}
          />
          <Select
            label="Papel"
            value={filtros.role}
            onChange={(e) => setFiltro('role', e.target.value)}
            options={ROLE_OPTIONS}
          />
        </div>

        {error ? (
          <div className="mt-4"><PageState error={error} /></div>
        ) : null}

        {loading ? (
          <div className="mt-4"><PageState loading /></div>
        ) : items.length === 0 ? (
          <div className="mt-4">
            <PageState isEmpty emptyMessage="Nenhum usuário encontrado com os filtros atuais." />
          </div>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr
                    style={{ color: 'var(--text-muted)' }}
                    className="text-left text-xs uppercase"
                  >
                    <th className="px-3 py-2">Usuário</th>
                    <th className="px-3 py-2">Tenant</th>
                    <th className="px-3 py-2">Papel</th>
                    <th className="px-3 py-2">Criado em</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((u) => (
                    <tr
                      key={u.id}
                      style={{ borderTop: '1px solid var(--border-soft)' }}
                    >
                      <td className="px-3 py-2">
                        <div className="font-medium">{u.nome || u.username}</div>
                        <div
                          className="font-mono text-xs"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {u.email}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-1">
                          <span>{u.tenant?.nome || '—'}</span>
                          {u.tenant?.kind === 'SYSTEM' ? (
                            <Badge variant="blue">
                              <FontAwesomeIcon
                                icon={faShieldHalved}
                                className="mr-1 text-[10px]"
                              />
                              SYSTEM
                            </Badge>
                          ) : null}
                          {u.tenant && !u.tenant.ativo ? (
                            <Badge variant="red">Inativo</Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Badge
                          variant={
                            u.role === 'superadmin'
                              ? 'blue'
                              : u.role === 'admin'
                              ? 'purple'
                              : 'slate'
                          }
                        >
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">{formatarData(u.createdAt)}</td>
                      <td className="px-3 py-2 text-right">
                        {u.tenant?.kind === 'SYSTEM' ? (
                          <span
                            className="text-xs"
                            style={{ color: 'var(--text-muted)' }}
                            title="Reset cross-tenant não se aplica a usuários do Tenant System"
                          >
                            —
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setResetModal(u)}
                            disabled={resetandoId === u.id}
                          >
                            <FontAwesomeIcon icon={faKey} />
                            <span className="ml-2">
                              {resetandoId === u.id ? '...' : 'Reset senha'}
                            </span>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>{total} resultado(s)</span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Anterior
                </Button>
                <span className="font-mono">
                  {page} / {totalPaginas}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page >= totalPaginas}
                  onClick={() => setPage(page + 1)}
                >
                  Próximo
                </Button>
              </div>
            </div>
          </>
        )}
      </PageSection>
    </>
  );
}

export default SuperAdminUsuariosPage;
