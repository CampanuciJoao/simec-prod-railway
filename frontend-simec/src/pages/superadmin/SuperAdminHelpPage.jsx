import React, { useCallback, useEffect, useState } from 'react';
import { faBookOpen } from '@fortawesome/free-solid-svg-icons';

import {
  atualizarHelpArticle,
  criarHelpArticle,
  listarHelpArticlesAdmin,
} from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import {
  Button,
  FormActions,
  FormSection,
  Input,
  PageSection,
  PageState,
  ResponsiveGrid,
  Textarea,
} from '@/components/ui';

const INITIAL_FORM = {
  categoria: '',
  titulo: '',
  slug: '',
  resumo: '',
  conteudoMarkdown: '',
  audience: 'all',
};

function SuperAdminHelpPage() {
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await listarHelpArticlesAdmin();
      setItems(response.items || []);
    } catch {
      addToast('Erro ao carregar artigos da base de ajuda.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSelect = (item) => {
    setSelected(item);
    setFormData(item);
  };

  const handleNew = () => {
    setSelected(null);
    setFormData(INITIAL_FORM);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);

    try {
      if (selected?.id) {
        await atualizarHelpArticle(selected.id, formData);
        addToast('Artigo atualizado com sucesso.', 'success');
      } else {
        await criarHelpArticle(formData);
        addToast('Artigo criado com sucesso.', 'success');
      }

      await load();
      handleNew();
    } catch (error) {
      addToast(
        error?.response?.data?.message || 'Erro ao salvar artigo.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageState loading />;
  }

  return (
    <PageSection
      title="Base de ajuda"
      description="Gerencie os artigos que alimentam FAQ, suporte operacional e onboarding."
      icon={faBookOpen}
      headerRight={
        <Button type="button" onClick={handleNew}>
          Novo artigo
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
                  selected?.id === item.id
                    ? 'var(--brand-primary)'
                    : 'var(--border-soft)',
                backgroundColor:
                  selected?.id === item.id
                    ? 'var(--brand-primary-surface-soft)'
                    : 'var(--bg-surface-soft)',
              }}
              onClick={() => handleSelect(item)}
            >
              <div className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--brand-primary)' }}
              >
                {item.categoria}
              </div>
              <div className="mt-1 font-semibold" style={{ color: 'var(--text-primary)' }}>
                {item.titulo}
              </div>
              <div className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                {item.slug}
              </div>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <FormSection title={selected ? 'Editar artigo' : 'Novo artigo'}>
            <ResponsiveGrid preset="form">
              <Input
                label="Categoria"
                value={formData.categoria}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    categoria: event.target.value,
                  }))
                }
                required
              />
              <Input
                label="Titulo"
                value={formData.titulo}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    titulo: event.target.value,
                  }))
                }
                required
              />
              <Input
                label="Slug"
                value={formData.slug}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    slug: event.target.value,
                  }))
                }
                required
              />
              <Input
                label="Audience"
                value={formData.audience}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    audience: event.target.value,
                  }))
                }
                placeholder="all, admin ou superadmin"
              />
            </ResponsiveGrid>

            <div className="mt-4">
              <Input
                label="Resumo"
                value={formData.resumo || ''}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    resumo: event.target.value,
                  }))
                }
              />
            </div>

            <div className="mt-4">
              <Textarea
                label="Conteudo"
                rows={18}
                value={formData.conteudoMarkdown}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    conteudoMarkdown: event.target.value,
                  }))
                }
                required
              />
            </div>

            <FormActions
              primaryAction={
                <Button type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : selected ? 'Salvar artigo' : 'Criar artigo'}
                </Button>
              }
            />
          </FormSection>
        </form>
      </div>
    </PageSection>
  );
}

export default SuperAdminHelpPage;
