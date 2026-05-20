import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faWandMagicSparkles,
  faSpinner,
  faCircleExclamation,
  faLock,
} from '@fortawesome/free-solid-svg-icons';

import { FileDropZone } from '@/components/ui';

function ExtracaoApoliceCard({
  extraindo,
  requerSenha,
  senhaInvalida,
  erro,
  avisos,
  onDropPdf,
  onEnviarSenha,
  onCancelarSenha,
}) {
  const [senha, setSenha] = useState('');

  const handleSubmitSenha = (e) => {
    e.preventDefault();
    if (senha.trim()) {
      onEnviarSenha(senha.trim());
    }
  };

  if (requerSenha) {
    return (
      <div
        className="rounded-2xl border p-4"
        style={{
          borderColor: 'rgba(234, 179, 8, 0.4)',
          backgroundColor: 'rgba(234, 179, 8, 0.06)',
        }}
      >
        <div className="mb-3 flex items-center gap-2 text-sm font-medium" style={{ color: 'rgb(161, 98, 7)' }}>
          <FontAwesomeIcon icon={faLock} />
          PDF protegido por senha
        </div>
        <form onSubmit={handleSubmitSenha} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="password"
            autoFocus
            placeholder="Digite a senha do PDF"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="input flex-1"
            disabled={extraindo}
          />
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={extraindo || !senha.trim()}>
              {extraindo ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> Extraindo…
                </>
              ) : (
                'Extrair'
              )}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onCancelarSenha} disabled={extraindo}>
              Cancelar
            </button>
          </div>
        </form>
        {senhaInvalida ? (
          <p className="mt-2 text-xs" style={{ color: 'var(--color-danger)' }}>
            Senha incorreta. Tente novamente.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor: 'var(--border-soft)',
        backgroundColor: 'var(--bg-surface-soft)',
      }}
    >
      <div className="mb-3 flex items-start gap-3">
        <FontAwesomeIcon icon={faWandMagicSparkles} className="mt-0.5 text-base" style={{ color: 'var(--brand-primary)' }} />
        <div className="min-w-0">
          <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Tem a apólice em PDF?
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Arraste o arquivo aqui e a IA preenche os campos abaixo automaticamente.
          </div>
        </div>
      </div>

      <FileDropZone
        accept=".pdf"
        multiple={false}
        label={extraindo ? 'Lendo apólice…' : 'Arraste a apólice em PDF ou'}
        ctaLabel={extraindo ? '' : 'clique para selecionar'}
        hint={extraindo ? 'Pode levar alguns segundos' : 'Aceita PDF de seguradoras como Tokio Marine, Bradesco, MAPFRE, HDI etc.'}
        onFiles={onDropPdf}
        disabled={extraindo}
      />

      {extraindo ? (
        <div className="mt-3 flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
          A IA está lendo o documento…
        </div>
      ) : null}

      {erro ? (
        <div
          className="mt-3 flex items-start gap-2 rounded-lg p-2 text-xs"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            color: 'var(--color-danger)',
          }}
        >
          <FontAwesomeIcon icon={faCircleExclamation} className="mt-0.5" />
          <span>{erro.message}</span>
        </div>
      ) : null}

      {avisos.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1.5">
          {avisos.map((a, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded-lg p-2 text-xs"
              style={{
                backgroundColor: 'rgba(234, 179, 8, 0.08)',
                color: 'rgb(161, 98, 7)',
              }}
            >
              <FontAwesomeIcon icon={faCircleExclamation} className="mt-0.5 shrink-0" />
              <span>{a.mensagem}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

ExtracaoApoliceCard.propTypes = {
  extraindo: PropTypes.bool,
  requerSenha: PropTypes.bool,
  senhaInvalida: PropTypes.bool,
  erro: PropTypes.object,
  avisos: PropTypes.array,
  onDropPdf: PropTypes.func.isRequired,
  onEnviarSenha: PropTypes.func.isRequired,
  onCancelarSenha: PropTypes.func.isRequired,
};

export default ExtracaoApoliceCard;
