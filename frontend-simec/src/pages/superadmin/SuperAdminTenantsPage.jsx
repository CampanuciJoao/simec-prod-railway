import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { faBuildingShield } from '@fortawesome/free-solid-svg-icons';

import {
  alterarStatusTenant,
  bootstrapAdminTenant,
  criarTenant,
  listarTenants,
  atualizarTenant,
} from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import {
  Button,
  FormActions,
  FormSection,
  Input,
  ModalConfirmacao,
  PageSection,
  PageState,
  ResponsiveGrid,
} from '@/components/ui';

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

function SuperAdminTenantsPage() {
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusModalTenant, setStatusModalTenant] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await listarTenants();
      const nextItems = response.items || [];
      setItems(nextItems);
      if (!selectedTenant && nextItems.length > 0) {
        setSelectedTenant(nextItems[0]);
        setFormData({
          ...nextItems[0],
          admin: INITIAL_FORM.admin,
        });
      }
    } catch {
      addToast('Erro ao carregar tenants.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, selectedTenant]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedSummary = useMemo(
    () => items.find((item) => item.id === selectedTenant?.id) || selectedTenant,
    [items, selectedTenant]
  );

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
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleChangeAdmin = (field, value) => {
    setFormData((current) => ({
      ...current,
      admin: {
        ...current.admin,
        [field]: value,
      },
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
      setFormData((current) => ({
        ...current,
        admin: INITIAL_FORM.admin,
      }));
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
      await alterarStatusTenant(statusModalTenant.id, !statusModalTenant.ativo);
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

      <PageSection
        title="Clientes / Tenants"
        description="Crie clientes, ajuste configuracoes da empresa e acompanhe metricas basicas do uso."
        icon={faBuildingShield}
        headerRight={
          <Button type="button" onClick={handleCreateNew}>
            Novo cliente
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-3">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full rounded-2xl border p-4 text-left transition hover:opacity-95"
                style={{
                  borderColor:
                    selectedSummary?.id === item.id
                      ? 'var(--brand-primary)'
                      : 'var(--border-soft)',
                  backgroundColor:
                    selectedSummary?.id === item.id
                      ? 'var(--brand-primary-surface-soft)'
                      : 'var(--bg-surface-soft)',
                }}
                onClick={() => handleSelectTenant(item)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {item.nome}
                  </div>
                  <div className="text-xs font-semibold uppercase"
                    style={{ color: item.ativo ? 'var(--success-700)' : 'var(--danger-700)' }}
                  >
                    {item.ativo ? 'Ativo' : 'Inativo'}
                  </div>
                </div>
                <div className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                  {item.slug}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>{item.metricas?.usuarios || 0} usuarios</span>
                  <span>{item.metricas?.equipamentos || 0} equipamentos</span>
                  <span>{item.metricas?.unidades || 0} unidades</span>
                  <span>{item.metricas?.alertas || 0} alertas</span>
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <FormSection title={selectedTenant ? 'Editar tenant' : 'Novo tenant'}>
                <ResponsiveGrid preset="form">
                  <Input
                    label="Nome"
                    value={formData.nome || ''}
                    onChange={(event) => handleChange('nome', event.target.value)}
                    required
                  />
                  <Input
                    label="Slug"
                    value={formData.slug || ''}
                    onChange={(event) => handleChange('slug', event.target.value)}
                    required
                    disabled={!!selectedTenant}
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
                    onChange={(event) => handleChange('locale', event.target.value)}
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
                  <div className="mt-6 space-y-4 rounded-2xl border p-4"
                    style={{
                      borderColor: 'var(--border-soft)',
                      backgroundColor: 'var(--bg-surface-soft)',
                    }}
                  >
                    <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
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
                      {saving ? 'Salvando...' : selectedTenant ? 'Salvar tenant' : 'Criar tenant'}
                    </Button>
                  }
                  secondaryAction={
                    selectedTenant ? (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setStatusModalTenant(selectedTenant)}
                      >
                        {selectedTenant.ativo ? 'Inativar tenant' : 'Ativar tenant'}
                      </Button>
                    ) : null
                  }
                />
              </FormSection>
            </form>

            {selectedTenant ? (
              <FormSection
                title="Bootstrap de administrador"
                description="Use este bloco apenas se o tenant ainda nao tiver um admin principal."
              >
                <ResponsiveGrid preset="form">
                  <Input
                    label="Nome"
                    value={formData.admin.nome}
                    onChange={(event) => handleChangeAdmin('nome', event.target.value)}
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
                    onChange={(event) => handleChangeAdmin('email', event.target.value)}
                  />
                  <Input
                    label="Senha inicial"
                    type="password"
                    value={formData.admin.senha}
                    onChange={(event) => handleChangeAdmin('senha', event.target.value)}
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
    </>
  );
}

export default SuperAdminTenantsPage;
