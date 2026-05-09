import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faCopy, faCheck, faPaperPlane } from '@fortawesome/free-solid-svg-icons';

function TelegramTokenModal({ open, tokenData, botUsername, onClose }) {
  const [copiado, setCopiado] = useState(false);

  if (!open || !tokenData) return null;

  const expiraEm = tokenData.expiresAt
    ? new Date(tokenData.expiresAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null;

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(`/conectar ${tokenData.token}`);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      /* fallback silencioso */
    }
  };

  const botLink = botUsername
    ? `https://t.me/${botUsername}`
    : 'https://t.me/SimecAlertasBot';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-900">Vincular via Telegram</h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="px-5 py-6 space-y-5">
          <p className="text-sm text-slate-600">
            Envie o comando abaixo para o bot <strong>@SimecAlertasBot</strong> no Telegram para vincular seu chat ou grupo.
          </p>

          {/* Código */}
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-600">Comando para enviar ao bot</p>
            <div className="flex items-center gap-3">
              <code className="flex-1 rounded-xl bg-white px-4 py-3 font-mono text-lg font-bold tracking-widest text-slate-900 border border-slate-200">
                /conectar {tokenData.token}
              </code>
              <button
                type="button"
                onClick={handleCopiar}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
                title="Copiar comando"
              >
                <FontAwesomeIcon icon={copiado ? faCheck : faCopy} className={copiado ? 'text-green-500' : ''} />
              </button>
            </div>
            {expiraEm && (
              <p className="mt-2 text-xs text-blue-500">⏱ Válido até {expiraEm} — gere um novo se expirar.</p>
            )}
          </div>

          {/* Passos */}
          <ol className="space-y-2 text-sm text-slate-700">
            <li className="flex gap-2"><span className="font-bold text-blue-600">1.</span> Abra o Telegram e busque <strong>@SimecAlertasBot</strong></li>
            <li className="flex gap-2"><span className="font-bold text-blue-600">2.</span> Envie o comando acima (ou cole e pressione enviar)</li>
            <li className="flex gap-2"><span className="font-bold text-blue-600">3.</span> O bot confirmará a vinculação automaticamente</li>
            <li className="flex gap-2"><span className="font-bold text-blue-600">4.</span> Para grupos: adicione o bot ao grupo antes de enviar</li>
          </ol>

          <a
            href={botLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <FontAwesomeIcon icon={faPaperPlane} />
            Abrir @SimecAlertasBot no Telegram
          </a>
        </div>
      </div>
    </div>
  );
}

TelegramTokenModal.propTypes = {
  open: PropTypes.bool.isRequired,
  tokenData: PropTypes.shape({ token: PropTypes.string, expiresAt: PropTypes.string }),
  botUsername: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

export default TelegramTokenModal;
