// Card de preview de relatorio renderizado dentro da bolha do chat.
// Recebe o payload `preview` retornado pelo agent (RelatorioService) e
// mostra: titulo + filtros aplicados + tabela compacta + resumo +
// botao 'Baixar PDF'.
//
// O PDF nao eh gerado ate o usuario clicar — economiza recursos. Quando
// clica, dispara a action existente (GERAR_PDF_RELATORIO ou GERAR_PDF_OS).

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFilePdf,
  faTriangleExclamation,
  faSpinner,
  faCircleCheck,
} from '@fortawesome/free-solid-svg-icons';

function RelatorioPreviewCard({ preview, onDownload, downloadAvailable = true }) {
  const [baixando, setBaixando] = useState(false);
  const [baixouOk, setBaixouOk] = useState(false);

  if (!preview || !preview.tipo) return null;

  const handleClick = async () => {
    if (baixando || !onDownload) return;
    setBaixando(true);
    setBaixouOk(false);
    try {
      await onDownload();
      setBaixouOk(true);
      setTimeout(() => setBaixouOk(false), 4000);
    } finally {
      setBaixando(false);
    }
  };

  const linhas = Array.isArray(preview.linhas) ? preview.linhas : [];
  const colunas = Array.isArray(preview.colunas) ? preview.colunas : [];
  const filtros = Array.isArray(preview.filtros) ? preview.filtros : [];
  const resumo = preview.resumo || {};

  return (
    <div
      className="mt-3 overflow-hidden rounded-2xl border"
      style={{
        borderColor: 'var(--border-soft)',
        backgroundColor: 'var(--bg-surface-soft)',
      }}
    >
      {/* Cabeçalho */}
      <div
        className="flex items-start justify-between gap-3 border-b px-4 py-3"
        style={{ borderColor: 'var(--border-soft)' }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faFilePdf}
              style={{ color: 'var(--color-danger)' }}
            />
            <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {preview.titulo || 'Relatório'}
            </h4>
          </div>
          {filtros.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              {filtros.map((f, i) => (
                <span key={i}>
                  <strong>{f.label}:</strong> {f.value}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Tabela compacta */}
      {linhas.length > 0 && colunas.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead style={{ backgroundColor: 'var(--bg-surface)' }}>
              <tr style={{ color: 'var(--text-muted)' }} className="text-left uppercase tracking-wide">
                {colunas.map((c, i) => (
                  <th key={i} className="px-3 py-2 font-semibold">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhas.map((linha, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border-soft)' }}>
                  {linha.map((celula, j) => (
                    <td
                      key={j}
                      className="px-3 py-2"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {celula}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {preview.totalLinhasPreview ? (
        <div
          className="px-4 py-2 text-[11px]"
          style={{
            color: 'var(--text-muted)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          {preview.totalLinhasPreview}
        </div>
      ) : null}

      {/* Avisos de limite */}
      {(resumo.avisoLimite || resumo.avisoPeriodoCapado) ? (
        <div
          className="border-t px-4 py-2 text-xs"
          style={{
            borderColor: 'var(--color-warning-soft)',
            backgroundColor: 'var(--color-warning-soft)',
            color: 'var(--color-warning)',
          }}
        >
          <div className="flex items-start gap-2">
            <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5" />
            <div className="min-w-0 space-y-1">
              {resumo.avisoLimite ? <p>{resumo.avisoLimite}</p> : null}
              {resumo.avisoPeriodoCapado ? <p>{resumo.avisoPeriodoCapado}</p> : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Rodapé com contagem (e botão se download disponível) */}
      <div
        className="flex items-center justify-between gap-3 border-t px-4 py-3"
        style={{
          borderColor: 'var(--border-soft)',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>
            {resumo.totalIncluido ?? linhas.length}
          </strong>{' '}
          {resumo.totalIncluido === 1 ? 'item' : 'itens'}
          {downloadAvailable ? ' no PDF' : ''}
        </div>
        {downloadAvailable ? (
          <button
            type="button"
            onClick={handleClick}
            disabled={baixando}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-60"
            style={{
              backgroundColor: baixouOk ? 'var(--color-success)' : 'var(--brand-primary)',
              color: 'white',
            }}
          >
            <FontAwesomeIcon
              icon={baixando ? faSpinner : baixouOk ? faCircleCheck : faFilePdf}
              spin={baixando}
            />
            {baixando ? 'Gerando...' : baixouOk ? 'Baixado' : 'Baixar PDF'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

RelatorioPreviewCard.propTypes = {
  preview: PropTypes.shape({
    tipo: PropTypes.string,
    titulo: PropTypes.string,
    filtros: PropTypes.array,
    colunas: PropTypes.array,
    linhas: PropTypes.array,
    resumo: PropTypes.object,
    totalLinhasPreview: PropTypes.string,
  }),
  onDownload: PropTypes.func,
  downloadAvailable: PropTypes.bool,
};

export default RelatorioPreviewCard;
