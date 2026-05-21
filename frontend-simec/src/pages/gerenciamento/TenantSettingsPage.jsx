import React, { useCallback, useEffect, useState } from 'react';
import { faBuilding } from '@fortawesome/free-solid-svg-icons';

import { getTenantSettings, updateTenantSettings } from '@/services/api';
import {
  Button,
  FormActions,
  FormSection,
  Input,
  PageSection,
  PageState,
  ResponsiveGrid,
} from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import LogoUploadCard from '@/components/gerenciamento/LogoUploadCard';

function TenantSettingsPage() {
  const { addToast } = useToast();
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getTenantSettings();
      setFormData(response);
    } catch {
      addToast('Erro ao carregar configuracoes da empresa.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleChange = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      const updated = await updateTenantSettings(formData);
      setFormData(updated);
      addToast('Configuracoes da empresa atualizadas com sucesso.', 'success');
    } catch (error) {
      addToast(
        error?.response?.data?.message || 'Erro ao salvar configuracoes.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading || !formData) {
    return <PageState loading />;
  }

  return (
    <PageSection
      title="Configuracoes da empresa"
      description="Mantenha o tenant alinhado com timezone, idioma e contatos operacionais."
      icon={faBuilding}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection title="Identidade da empresa">
          <ResponsiveGrid preset="form">
            <Input
              label="Nome da empresa"
              value={formData.nome || ''}
              onChange={(event) => handleChange('nome', event.target.value)}
              required
            />
            <Input label="Slug" value={formData.slug || ''} readOnly disabled />
            <Input
              label="Timezone"
              value={formData.timezone || ''}
              onChange={(event) => handleChange('timezone', event.target.value)}
              required
            />
            <Input
              label="Locale"
              value={formData.locale || ''}
              onChange={(event) => handleChange('locale', event.target.value)}
              required
            />
          </ResponsiveGrid>
        </FormSection>

        <FormSection
          title="Logo da empresa"
          description="O logo aparece no canto superior dos PDFs gerados (orçamentos, OS, relatórios, conformidade ANVISA). Sem logo configurado, os PDFs usam o logo SIMEC default."
        >
          <LogoUploadCard temLogo={!!formData.temLogo} onChange={load} />
        </FormSection>

        <FormSection title="Contatos operacionais">
          <ResponsiveGrid preset="form">
            <Input
              label="Responsavel"
              value={formData.contatoNome || ''}
              onChange={(event) => handleChange('contatoNome', event.target.value)}
            />
            <Input
              label="E-mail operacional"
              type="email"
              value={formData.contatoEmail || ''}
              onChange={(event) => handleChange('contatoEmail', event.target.value)}
            />
            <Input
              label="Telefone"
              value={formData.contatoTelefone || ''}
              onChange={(event) =>
                handleChange('contatoTelefone', event.target.value)
              }
            />
          </ResponsiveGrid>
        </FormSection>

        <FormActions
          primaryAction={
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar configuracoes'}
            </Button>
          }
        />
      </form>
    </PageSection>
  );
}

export default TenantSettingsPage;
