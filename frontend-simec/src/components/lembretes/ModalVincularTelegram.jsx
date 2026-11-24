import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleCheck,
  faCopy,
  faPaperPlane,
  faTriangleExclamation,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import { QRCodeSVG } from 'qrcode.react';

import { Button } from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import {
  gerarTokenVinculacaoUsuario,
  getStatusVinculacaoUsuario,
  desvincularTelegramUsuario,
} from '@/services/api';

const POLL_MS = 3000;

/**
 * Modal self-service: usuario comum vincula/desvincula o proprio Telegram
 * privado pra receber lembretes como DM (nao polui o grupo do tenant).
 *
 * Fluxo:
 *   1. GET /vincular/status — se ja vinculado, mostra badge "Vinculado" + botao Desvincular
 *   2. Se nao, POST /vincular/gerar-token → link t.me/BOT?start=TOKEN + QR
 *   3. Polling a cada 3s em /vincular/status — detecta vinculacao e fecha modal
 */
function ModalVincularTelegram({ open, onClose, onChange }) {
  const toast = useToast();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gerando, setGerando] = useState(false);
  const pollRef = useRef(null);

  const buscarStatus = useCallback(async () => {
    try {
      const r = await getStatusVinculacaoUsuario();
      setStatus(r);
      return r;
    } catch (err) {
      console.error('[VINCULAR_STATUS]', err);
      return null;
    }
  }, []);

  // Carrega status quando o modal abre, e cria link se usuario nunca gerou
  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const atual = await buscarStatus();
      if (atual && atual.status === 'nao-vinculado') {
        await handleGerarLink();
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Polling enquanto aguarda o usuario clicar no link no Telegram
  useEffect(() => {
    if (!open) return;
    if (status?.status !== 'aguardando') return;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const r = await buscarStatus();
      if (r?.status === 'vinculado') {
        clearInterval(pollRef.current);
        pollRef.current = null;
        toast?.addToast?.('Telegram vinculado com sucesso!', 'success');
        onChange?.();
      }
    }, POLL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open, status?.status, buscarStatus, toast, onChange]);

  const handleGerarLink = async () => {
    try {
      setGerando(true);
      await gerarTokenVinculacaoUsuario();
      await buscarStatus();
    } catch (err) {
      toast?.addToast?.('Erro ao gerar código de vinculação.', 'error');
    } finally {
      setGerando(false);
    }
  };

  const handleDesvincular = async () => {
    try {
      await desvincularTelegramUsuario();
      toast?.addToast?.('Telegram desvinculado.', 'info');
      await buscarStatus();
      onChange?.();
    } catch (err) {
      toast?.addToast?.('Erro ao desvincular.', 'error');
    }
  };

  const copiarLink = async () => {
    const link = status?.linkTelegram;
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast?.addToast?.('Link copiado.', 'success');
    } catch {
      toast?.addToast?.('Não consegui copiar — copie manualmente.', 'warning');
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-[2px]"
      style={{ backgroundColor: 'rgba(2, 6, 23, 0.55)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border shadow-2xl"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-soft)',
          color: 'var(--text-primary)',
        }}
        onClick={(ev) => ev.stopPropagation()}
      >
        <div
          className="flex items-center justify-between gap-4 px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-soft)' }}
        >
          <h3 className="text-lg font-semibold">
            <FontAwesomeIcon icon={faPaperPlane} className="mr-2 opacity-70" />
            Meu Telegram
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg transition"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Fechar"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-4">
          {loading ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Carregando...
            </p>
          ) : status?.status === 'vinculado' ? (
            <>
              <div
                className="rounded-xl border p-4"
                style={{
                  borderColor: 'var(--color-success-soft)',
                  backgroundColor: 'var(--color-success-surface)',
                }}
              >
                <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--color-success)' }}>
                  <FontAwesomeIcon icon={faCircleCheck} />
                  Telegram vinculado
                </p>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {status.chat?.nome ? `Chat: ${status.chat.nome}` : null}
                </p>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Seus lembretes vão chegar aqui no privado.
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleDesvincular}>
                Desvincular
              </Button>
            </>
          ) : status?.status === 'aguardando' && status.linkTelegram ? (
            <>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Clique no botão abaixo ou escaneie o QR code com o celular.
                Ao abrir o Telegram, aperte <strong>"Iniciar"</strong>.
              </p>

              <a
                href={status.linkTelegram}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-xl px-4 py-3 text-center text-sm font-semibold transition"
                style={{ backgroundColor: 'var(--brand-primary)', color: '#ffffff' }}
              >
                <FontAwesomeIcon icon={faPaperPlane} className="mr-2" />
                Abrir Telegram e vincular
              </a>

              <div
                className="flex items-center justify-center rounded-xl p-4"
                style={{ backgroundColor: '#ffffff' }}
              >
                <QRCodeSVG value={status.linkTelegram} size={200} level="M" includeMargin />
              </div>

              <div className="flex items-center gap-2">
                <code
                  className="flex-1 truncate rounded-lg px-3 py-2 text-xs"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                  }}
                  title={status.linkTelegram}
                >
                  {status.linkTelegram}
                </code>
                <Button variant="secondary" size="sm" onClick={copiarLink} title="Copiar link">
                  <FontAwesomeIcon icon={faCopy} />
                </Button>
              </div>

              <p
                className="rounded-lg border px-3 py-2 text-xs"
                style={{
                  borderColor: 'var(--border-soft)',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  color: 'var(--text-muted)',
                }}
              >
                Aguardando você apertar <strong>Iniciar</strong> no Telegram...
                Esta janela vai fechar sozinha quando detectar a vinculação.
              </p>
            </>
          ) : (
            <>
              {!status?.botUsername && (
                <div
                  className="rounded-lg border px-3 py-2 text-sm"
                  style={{
                    borderColor: 'var(--color-warning-soft)',
                    backgroundColor: 'var(--color-warning-surface)',
                    color: 'var(--color-warning)',
                  }}
                >
                  <FontAwesomeIcon icon={faTriangleExclamation} className="mr-1" />
                  Bot de lembretes ainda não disponível. Confira no Railway
                  se <code>TELEGRAM_LEMBRETES_BOT_TOKEN</code> está setado
                  no serviço <strong>backend</strong> e se o deploy já terminou.
                </div>
              )}
              <Button onClick={handleGerarLink} disabled={gerando || !status?.botUsername}>
                {gerando ? 'Gerando link...' : 'Gerar link de vinculação'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

ModalVincularTelegram.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onChange: PropTypes.func,
};

export default ModalVincularTelegram;
