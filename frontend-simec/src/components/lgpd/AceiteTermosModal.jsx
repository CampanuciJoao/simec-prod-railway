// Modal bloqueante exibido apos login quando o usuario tem aceites
// pendentes (Politica de Privacidade ou Termos de Uso). Usuario precisa
// ler/aceitar antes de prosseguir.
//
// LGPD: registra (usuarioId, documento, versao, ip, userAgent, aceitoEm)
// no backend. Cumpre requisito de "manifestacao livre, informada e
// inequivoca" (Art. 5º, XII).

import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Button, Card, Checkbox } from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import { getDocumentoVigente, postAceite } from '@/services/api/lgpdApi';

const TITULOS = {
  politica_privacidade: 'Política de Privacidade',
  termos_uso: 'Termos de Uso',
};

function AceiteTermosModal({ pendencias, onConcluido }) {
  const { addToast } = useToast();
  const [indice, setIndice] = useState(0);
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aceito, setAceito] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const atual = pendencias[indice];

  useEffect(() => {
    if (!atual) return;
    setLoading(true);
    setAceito(false);
    setDoc(null);
    getDocumentoVigente(atual.documento)
      .then((data) => setDoc(data))
      .catch(() => {
        addToast('Erro ao carregar documento legal.', 'error');
      })
      .finally(() => setLoading(false));
  }, [atual, addToast]);

  if (!atual) return null;

  const handleAceitar = async () => {
    if (!aceito) return;
    setEnviando(true);
    try {
      await postAceite({ documento: atual.documento, versao: atual.versao });
      const proximo = indice + 1;
      if (proximo < pendencias.length) {
        setIndice(proximo);
      } else {
        addToast('Termos aceitos com sucesso.', 'success');
        onConcluido?.();
      }
    } catch (err) {
      addToast(err?.response?.data?.message || 'Erro ao registrar aceite.', 'error');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(2, 6, 23, 0.85)' }}
    >
      <Card
        className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl"
        style={{ maxHeight: '90vh', boxShadow: 'var(--shadow-lg)' }}
      >
        <div
          className="border-b px-6 py-4"
          style={{ borderColor: 'var(--border-soft)' }}
        >
          <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Aceite obrigatório · documento {indice + 1} de {pendencias.length}
          </p>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {TITULOS[atual.documento] || atual.documento}
          </h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Versão {atual.versao}{atual.vigenteDesde ? ` · vigente desde ${atual.vigenteDesde}` : ''}
          </p>
        </div>

        <div
          className="flex-1 overflow-auto px-6 py-4"
          style={{ backgroundColor: 'var(--bg-surface)' }}
        >
          {loading && <p style={{ color: 'var(--text-muted)' }}>Carregando…</p>}
          {doc && (
            <article
              className="prose prose-invert max-w-none text-sm"
              style={{ color: 'var(--text-primary)', lineHeight: 1.65 }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.conteudoMarkdown}</ReactMarkdown>
            </article>
          )}
        </div>

        <div
          className="border-t px-6 py-4"
          style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-soft)' }}
        >
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={aceito}
              onChange={(e) => setAceito(e.target.checked)}
              disabled={enviando}
            />
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
              Li e concordo com a {TITULOS[atual.documento] || atual.documento} (versão {atual.versao}).
            </span>
          </label>

          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              variant="primary"
              onClick={handleAceitar}
              disabled={!aceito || enviando || loading}
            >
              {enviando ? 'Registrando…' : indice + 1 < pendencias.length ? 'Aceitar e prosseguir' : 'Aceitar e entrar'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

AceiteTermosModal.propTypes = {
  pendencias: PropTypes.arrayOf(
    PropTypes.shape({
      documento: PropTypes.string.isRequired,
      versao: PropTypes.string.isRequired,
      vigenteDesde: PropTypes.string,
    }),
  ).isRequired,
  onConcluido: PropTypes.func,
};

export default AceiteTermosModal;
