import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuildingShield,
  faRightToBracket,
  faShieldHalved,
} from '@fortawesome/free-solid-svg-icons';

import {
  alterarStatusTenant,
  bootstrapAdminTenant,
  criarTenant,
  listarTenants,
  atualizarTenant,
} from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Badge,
  Button,
  FormActions,
  FormSection,
  Input,
  ModalConfirmacao,
  PageSection,
  PageState,
  ResponsiveGrid,
} from '@/components/ui';
import ImpersonarTenantModal from '@/components/superadmin/ImpersonarTenantModal';

const INITIAL_FORM = {
  nome: '',
  slug: '',
  timezone: 'America/Cuiaba',
  locale: 'pt-BR',
  contatoNome: '',
  contatoEmail: '',
  contatoTelefone: '',
  admin: {
    nome: '',
    username: '',
    email: '',
    senha: '',
  },
};

function StatCard({ label, value, hint }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: 'var(--border-soft)',
        backgroundColor: 'var(--bg-surface)',
      }}
    >
      <div
        className="text-xs uppercase tracking-wide"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </div>
      <div
        className="mt-1 font-mono text-2xl tabular-nums"
        style={{ color: 'var(--text-primary)' }}
      >
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          {hint}
        </div>
      ) : null}
    </div>
  );
}

function SuperAdminTenantsPage() {
  const { addToast } = useToast();
  const { iniciarImpersonacao } = useAuth();
  const [items, setItems] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusModalTenant, setStatusModalTenant] = useState(null);
  const [impersonarModalTenant, setImpersonarModalTenant] = useState(null);
  const [impersonando, setImpersonando] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await listarTenants();
      const nextItems = response.items || [];
      setItems(nextItems);
    } catch {
      addToast('Erro ao carregar tenants.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedSummary = useMemo(
    () => items.find((item) => item.id === selectedTenant?.id) || selectedTenant,
    [items, selectedTenant]
  );

  // KPIs cross-tenant — visão executiva do plano de controle.
  const kpis = useMemo(() => {
    const customers = items.filter((t) => t.kind !== 'SYSTEM');
    return {
      totalClientes: customers.length,
      ativos: customers.filter((t) => t.ativo).length,
      inativos: customers.filter((t) => !t.ativo).length,
      usuariosTotais: items.reduce(
        (acc, t) => acc + (t.metricas?.usuarios || 0),
        0
      ),
      equipamentosTotais: customers.reduce(
        (acc, t) => acc + (t.metricas?.equipamentos || 0),
        0
      ),
    };
  }, [items]);

  const handleSelectTenant = (tenant) => {
    setSelectedTenant(tenant);
    setFormData({
      ...tenant,
      admin: INITIAL_FORM.admin,
    });
  };

  const handleCreateNew = () => {
    setSelectedTenant(null);
    setFormData(INITIAL_FORM);
  };

  const handleChange = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleChangeAdmin = (field, value) => {
    setFormData((current) => ({
      ...current,
      admin: { ...current.admin, [field]: value },
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      if (selectedTenant?.id) {
        await atualizarTenant(selectedTenant.id, formData);
        addToast('Tenant atualizado com sucesso.', 'success');
      } else {
        await criarTenant(formData);
        addToast('Tenant criado com sucesso.', 'success');
      }

      await load();
    } catch (error) {
      addToast(
        error?.response?.data?.message || 'Erro ao salvar tenant.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBootstrapAdmin = async () => {
    if (!selectedTenant?.id) return;
    setSaving(true);

    try {
      await bootstrapAdminTenant(selectedTenant.id, formData.admin);
      addToast('Administrador inicial criado com sucesso.', 'success');
      setFormData((current) => ({ ...current, admin: INITIAL_FORM.admin }));
      await load();
    } catch (error) {
      addToast(
        error?.response?.data?.message ||
          'Erro ao criar administrador inicial.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmStatus = async () => {
    if (!statusModalTenant?.id) return;

    try {
      await alterarStatusTenant(
        statusModalTenant.id,
        !statusModalTenant.ativo
      );
      addToast('Status do tenant atualizado com sucesso.', 'success');
      await load();
      setStatusModalTenant(null);
    } catch (error) {
      addToast(
        error?.response?.data?.message || 'Erro ao alterar status do tenant.',
        'error'
      );
    }
  };

  const handleConfirmImpersonar = async (motivo) => {
    if (!impersonarModalTenant?.id) return;
    setImpersonando(true);
    try {
      await iniciarImpersonacao({
        tenantId: impersonarModalTenant.id,
        motivo,
      });
      // AuthContext redireciona para /dashboard após sucesso.
      setImpersonarModalTenant(null);
    } catch (error) {
      addToast(
        error?.response?.data?.message || 'Erro ao iniciar impersonação.',
        'error'
      );
    } finally {
      setImpersonando(false);
    }
  };

  if (loading) {
    return <PageState loading />;
  }

  return (
    <>
      <ModalConfirmacao
        isOpen={!!statusModalTenant}
        onClose={() => setStatusModalTenant(null)}
        onConfirm={handleConfirmStatus}
        title={statusModalTenant?.ativo ? 'Inativar tenant' : 'Ativar tenant'}
        message={
          statusModalTenant
            ? `Deseja ${statusModalTenant.ativo ? 'inativar' : 'ativar'} o tenant "${statusModalTenant.nome}"?`
            : ''
        }
      />

      <ImpersonarTenantModal
        tenant={impersonarModalTenant}
        onCancel={() => setImpersonarModalTenant(null)}
        onConfirm={handleConfirmImpersonar}
        loading={impersonando}
      />

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label="Clientes (total)"
            value={kpis.totalClientes}
            hint="Tenants kind=CUSTOMER"
          />
          <StatCard
            label="Ativos"
            value={kpis.ativos}
          />
          <StatCard
            label="Suspensos"
            value={kpis.inativos}
          />
          <StatCard
            label="Usuários (todos)"
            value={kpis.usuariosTotais.toLocaleString('pt-BR')}
            hint="Cross-tenant"
          />
          <StatCard
            label="Equipamentos"
            value={kpis.equipamentosTotais.toLocaleString('pt-BR')}
            hint="Em clientes ativos"
          />
        </div>

        <PageSection
          title="Clientes / Tenants"
          description="Gerencie os clientes do SaaS, abra sessões de impersonação para suporte e ajuste configurações da empresa."
          icon={faBuildingShield}
          headerRight={
            <Button type="button" onClick={handleCreateNew}>
              Novo cliente
            </Button>
          }
        >
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="space-y-3">
              {items.map((item) => {
                const isSystem = item.kind === 'SYSTEM';
                const isSelected = selectedSummary?.id === item.id;
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border p-4 transition"
                    style={{
                      borderColor: isSelected
                        ? 'var(--brand-primary)'
                        : 'var(--border-soft)',
                      backgroundColor: isSelected
                        ? 'var(--brand-primary-surface-soft)'
                        : 'var(--bg-surface-soft)',
                    }}
                  >
                    <button
                      type="button"
                      className="block w-full text-left"
                      onClick={() => handleSelectTenant(item)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div
                          className="font-semibold"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {item.nome}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {isSystem ? (
                            <Badge variant="blue">
                              <FontAwesomeIcon
                                icon={faShieldHalved}
                                className="mr-1 text-[10px]"
                              />
                              SYSTEM
                            </Badge>
                          ) : (
                            <Badge variant="slate">CLIENTE</Badge>
                          )}
                          {item.ativo ? (
                            <Badge variant="green">Ativo</Badge>
                          ) : (
                            <Badge variant="red">Inativo</Badge>
                          )}
                        </div>
                      </div>
                      <div
                        className="mt-1 font-mono text-xs"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {item.slug}
                      </div>
                      <div
                        className="mt-3 grid grid-cols-2 gap-1 text-xs"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <span>{item.metricas?.usuarios || 0} usuários</span>
                        <span>
                          {item.metricas?.equipamentos || 0} equipamentos
                        </span>
                        <span>{item.metricas?.unidades || 0} unidades</span>
                        <span>
                          {item.metricas?.manutencoes || 0} manutenções
                        </span>
                      </div>
                    </button>

                    {!isSystem && item.ativo ? (
                      <div className="mt-3 flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => setImpersonarModalTenant(item)}
                          title="Atuar como este cliente (sessão auditada)"
                        >
                          <FontAwesomeIcon icon={faRightToBracket} />
                          <span className="ml-2">Atuar como</span>
                        </Button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <FormSection
                  title={selectedTenant ? 'Editar tenant' : 'Novo tenant'}
                >
                  <ResponsiveGrid preset="form">
                    <Input
                      label="Nome"
                      value={formData.nome || ''}
                      onChange={(event) =>
                        handleChange('nome', event.target.value)
                      }
                      required
                    />
                    <Input
                      label="Slug"
                      value={formData.slug || ''}
                      onChange={(event) =>
                        handleChange('slug', event.target.value)
                      }
                      required
                      disabled={!!selectedTenant}
                      hint={
                        selectedTenant?.kind === 'SYSTEM'
                          ? 'Slug do Tenant System é imutável.'
                          : undefined
                      }
                    />
                    <Input
                      label="Timezone"
                      value={formData.timezone || ''}
                      onChange={(event) =>
                        handleChange('timezone', event.target.value)
                      }
                      required
                    />
                    <Input
                      label="Locale"
                      value={formData.locale || ''}
                      onChange={(event) =>
                        handleChange('locale', event.target.value)
                      }
                      required
                    />
                    <Input
                      label="Contato principal"
                      value={formData.contatoNome || ''}
                      onChange={(event) =>
                        handleChange('contatoNome', event.target.value)
                      }
                    />
                    <Input
                      label="E-mail de contato"
                      type="email"
                      value={formData.contatoEmail || ''}
                      onChange={(event) =>
                        handleChange('contatoEmail', event.target.value)
                      }
                    />
                    <Input
                      label="Telefone de contato"
                      value={formData.contatoTelefone || ''}
                      onChange={(event) =>
                        handleChange('contatoTelefone', event.target.value)
                      }
                    />
                  </ResponsiveGrid>

                  {!selectedTenant ? (
                    <div
                      className="mt-6 space-y-4 rounded-2xl border p-4"
                      style={{
                        borderColor: 'var(--border-soft)',
                        backgroundColor: 'var(--bg-surface-soft)',
                      }}
                    >
                      <div
                        className="font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        Administrador inicial
                      </div>
                      <ResponsiveGrid preset="form">
                        <Input
                          label="Nome"
                          value={formData.admin.nome}
                          onChange={(event) =>
                            handleChangeAdmin('nome', event.target.value)
                          }
                          required
                        />
                        <Input
                          label="Usuario"
                          value={formData.admin.username}
                          onChange={(event) =>
                            handleChangeAdmin('username', event.target.value)
                          }
                          required
                        />
                        <Input
                          label="E-mail"
                          type="email"
                          value={formData.admin.email}
                          onChange={(event) =>
                            handleChangeAdmin('email', event.target.value)
                          }
                          required
                        />
                        <Input
                          label="Senha inicial"
                          type="password"
                          value={formData.admin.senha}
                          onChange={(event) =>
                            handleChangeAdmin('senha', event.target.value)
                          }
                          required
                        />
                      </ResponsiveGrid>
                    </div>
                  ) : null}

                  <FormActions
                    primaryAction={
                      <Button type="submit" disabled={saving}>
                        {saving
                          ? 'Salvando...'
                          : selectedTenant
                          ? 'Salvar tenant'
                          : 'Criar tenant'}
                      </Button>
                    }
                    secondaryAction={
                      selectedTenant && selectedTenant.kind !== 'SYSTEM' ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setStatusModalTenant(selectedTenant)}
                        >
                          {selectedTenant.ativo
                            ? 'Inativar tenant'
                            : 'Ativar tenant'}
                        </Button>
                      ) : null
                    }
                  />
                </FormSection>
              </form>

              {selectedTenant && selectedTenant.kind !== 'SYSTEM' ? (
                <FormSection
                  title="Bootstrap de administrador"
                  description="Use este bloco apenas se o tenant ainda nao tiver um admin principal."
                >
                  <ResponsiveGrid preset="form">
                    <Input
                      label="Nome"
                      value={formData.admin.nome}
                      onChange={(event) =>
                        handleChangeAdmin('nome', event.target.value)
                      }
                    />
                    <Input
                      label="Usuario"
                      value={formData.admin.username}
                      onChange={(event) =>
                        handleChangeAdmin('username', event.target.value)
                      }
                    />
                    <Input
                      label="E-mail"
                      type="email"
                      value={formData.admin.email}
                      onChange={(event) =>
                        handleChangeAdmin('email', event.target.value)
                      }
                    />
                    <Input
                      label="Senha inicial"
                      type="password"
                      value={formData.admin.senha}
                      onChange={(event) =>
                        handleChangeAdmin('senha', event.target.value)
                      }
                    />
                  </ResponsiveGrid>
                  <div className="mt-4">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleBootstrapAdmin}
                      disabled={saving}
                    >
                      Criar administrador inicial
                    </Button>
                  </div>
                </FormSection>
              ) : null}
            </div>
          </div>
        </PageSection>
      </div>
    </>
  );
}

export default SuperAdminTenantsPage;
