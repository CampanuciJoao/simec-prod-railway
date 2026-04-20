import React, { useEffect, useMemo, useState } from 'react';
import { faLifeRing } from '@fortawesome/free-solid-svg-icons';

import { buscarHelpArticle, listarHelpArticles } from '@/services/api';
import {
  Button,
  Input,
  PageHeader,
  PageLayout,
  PageSection,
  PageState,
  Textarea,
} from '@/components/ui';

function HelpCenterPage() {
  const [items, setItems] = useState([]);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [categoria, setCategoria] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);
        const response = await listarHelpArticles(
          categoria ? { categoria } : {}
        );
        if (active) {
          setItems(response.items || []);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [categoria]);

  const categorias = useMemo(
    () => [...new Set(items.map((item) => item.categoria))],
    [items]
  );

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const term = search.toLowerCase();
    return items.filter(
      (item) =>
        item.titulo.toLowerCase().includes(term) ||
        item.resumo?.toLowerCase().includes(term)
    );
  }, [items, search]);

  const handleOpenArticle = async (slug) => {
    try {
      setDetailLoading(true);
      const article = await buscarHelpArticle(slug);
      setSelectedArticle(article);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <PageLayout padded fullHeight>
      <div className="space-y-6">
        <PageHeader
          title="Ajuda"
          subtitle="Base operacional para orientar usuarios, admins e operacao do SaaS"
          icon={faLifeRing}
        />

        <PageSection
          title="Central de conhecimento"
          description="Busque artigos por tema e abra a explicacao completa sem sair do sistema."
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="space-y-4">
              <Input
                label="Buscar"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ex.: historico, alertas, tenant"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={!categoria ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setCategoria('')}
                >
                  Todas
                </Button>
                {categorias.map((item) => (
                  <Button
                    key={item}
                    type="button"
                    variant={categoria === item ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setCategoria(item)}
                  >
                    {item}
                  </Button>
                ))}
              </div>

              {loading ? (
                <PageState loading />
              ) : filteredItems.length === 0 ? (
                <PageState isEmpty emptyMessage="Nenhum artigo encontrado." />
              ) : (
                <div className="space-y-3">
                  {filteredItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="w-full rounded-2xl border p-4 text-left transition hover:opacity-90"
                      style={{
                        borderColor: 'var(--border-soft)',
                        backgroundColor: 'var(--bg-surface-soft)',
                      }}
                      onClick={() => handleOpenArticle(item.slug)}
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
                        {item.resumo || 'Sem resumo adicional.'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border p-5"
              style={{
                borderColor: 'var(--border-soft)',
                backgroundColor: 'var(--bg-surface-soft)',
              }}
            >
              {detailLoading ? (
                <PageState loading />
              ) : selectedArticle ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: 'var(--brand-primary)' }}
                    >
                      {selectedArticle.categoria}
                    </div>
                    <h3 className="mt-2 text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {selectedArticle.titulo}
                    </h3>
                    <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                      {selectedArticle.resumo}
                    </p>
                  </div>
                  <Textarea
                    label="Conteudo"
                    value={selectedArticle.conteudoMarkdown}
                    readOnly
                    rows={16}
                  />
                </div>
              ) : (
                <PageState isEmpty emptyMessage="Selecione um artigo para visualizar o conteudo." />
              )}
            </div>
          </div>
        </PageSection>
      </div>
    </PageLayout>
  );
}

export default HelpCenterPage;
