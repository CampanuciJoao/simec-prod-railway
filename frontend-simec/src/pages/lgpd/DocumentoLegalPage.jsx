// Pagina publica que renderiza um documento legal vigente (Politica de
// Privacidade ou Termos de Uso) lido do backend. Usada em /privacidade e
// /termos. Acessivel sem autenticacao.

import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link, useParams } from 'react-router-dom';

import { getDocumentoVigente } from '@/services/api/lgpdApi';

const TITULOS = {
  politica_privacidade: 'Política de Privacidade',
  termos_uso: 'Termos de Uso',
};

function DocumentoLegalPage({ documento: documentoProp }) {
  const params = useParams();
  const documento = documentoProp || params.documento;

  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    setLoading(true);
    getDocumentoVigente(documento)
      .then((data) => setDoc(data))
      .catch((err) => setErro(err?.response?.data?.message || 'Erro ao carregar documento.'))
      .finally(() => setLoading(false));
  }, [documento]);

  return (
    <div
      className="min-h-screen w-full"
      style={{ backgroundColor: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      <header
        className="border-b px-6 py-4"
        style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface)' }}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link to="/" className="text-sm font-semibold" style={{ color: 'var(--brand-primary)' }}>
            ← Voltar ao SIMEC
          </Link>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {TITULOS[documento] || documento}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">
        {loading && <p style={{ color: 'var(--text-muted)' }}>Carregando…</p>}
        {erro && <p style={{ color: 'var(--color-danger)' }}>{erro}</p>}

        {doc && (
          <>
            <p className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }}>
              Versão {doc.versao}{doc.vigenteDesde ? ` · vigente desde ${doc.vigenteDesde}` : ''}
            </p>
            <article
              className="prose prose-invert max-w-none"
              style={{
                color: 'var(--text-primary)',
                lineHeight: 1.7,
              }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.conteudoMarkdown}</ReactMarkdown>
            </article>
          </>
        )}
      </main>
    </div>
  );
}

export default DocumentoLegalPage;
