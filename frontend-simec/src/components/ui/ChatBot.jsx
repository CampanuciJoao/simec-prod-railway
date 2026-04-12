import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCommentDots,
  faPaperPlane,
  faRobot,
  faXmark,
  faRotateRight,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons';

import ChatMessageBubble from '../ui/ChatMessageBubble';
import {
  enviarMensagemAoAgente,
  mapearHistoricoParaAPI,
} from '../../services/api/agentApi';

function formatTime(date = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

const QUICK_ACTIONS = [
  'Mostrar equipamentos inoperantes',
  'Quais alertas estão pendentes?',
  'Resumo das manutenções',
  'Quero a apólice da unidade de Coxim',
];

function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: crypto.randomUUID(),
      role: 'assistant',
      content:
        'Olá. Sou o **agente do SIMEC**.\n\nPosso ajudar com:\n- equipamentos\n- manutenções\n- seguros\n- contratos\n- alertas\n- BI e relatórios',
      createdAt: formatTime(),
    },
  ]);

  const chatRef = useRef(null);
  const listRef = useRef(null);
  const textareaRef = useRef(null);

  const canSend = useMemo(
    () => input.trim().length > 0 && !isTyping,
    [input, isTyping]
  );

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  };

  const focusInput = () => {
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      autoResize();
    });
  };

  useEffect(() => {
    autoResize();
  }, [input]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDownOutside = (event) => {
      if (!chatRef.current) return;
      if (!chatRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDownOutside);
    document.addEventListener('touchstart', handlePointerDownOutside);

    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('touchstart', handlePointerDownOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      focusInput();
    }
  }, [isOpen]);

  const appendAssistantMessage = (content) => {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content,
        createdAt: formatTime(),
      },
    ]);
  };

  const handleSend = async (forcedText) => {
    const texto = (forcedText ?? input).trim();
    if (!texto || isTyping) return;

    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: texto,
      createdAt: formatTime(),
    };

    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput('');
    setIsTyping(true);
    focusInput();

    try {
      const historico = mapearHistoricoParaAPI(nextMessages);

      const resultado = await enviarMensagemAoAgente({
        mensagem: texto,
        historico,
        contextoExtra: null,
      });

      const mensagemAgente =
        resultado?.mensagem || 'Não recebi uma resposta válida do agente.';

      appendAssistantMessage(mensagemAgente);
    } catch (error) {
      appendAssistantMessage(
        'Não consegui responder agora.\n\nTente novamente em instantes.'
      );
    } finally {
      setIsTyping(false);
      focusInput();
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Conversa reiniciada.\n\nComo posso ajudar você agora?',
        createdAt: formatTime(),
      },
    ]);
    setInput('');
    setIsTyping(false);
    focusInput();
  };

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[80] inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:scale-105 hover:bg-blue-700"
          aria-label="Abrir assistente"
        >
          <FontAwesomeIcon icon={faCommentDots} />
        </button>
      )}

      {isOpen && (
        <div
          ref={chatRef}
          className="fixed bottom-6 right-6 z-[80] flex h-[78vh] w-[420px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-4 py-3 text-white">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-200">
                <FontAwesomeIcon icon={faRobot} />
              </span>

              <div>
                <p className="text-sm font-semibold">Assistente SIMEC</p>
                <p className="text-xs text-slate-300">
                  Operação, cadastro e análise
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleReset}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white"
                title="Reiniciar conversa"
              >
                <FontAwesomeIcon icon={faRotateRight} />
              </button>

              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setIsOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white"
                title="Fechar"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
          </div>

          <div className="border-b border-slate-200 bg-slate-50 px-3 py-3">
            <div className="flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSend(action)}
                  disabled={isTyping}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FontAwesomeIcon
                    icon={faWandMagicSparkles}
                    className="text-blue-500"
                  />
                  {action}
                </button>
              ))}
            </div>
          </div>

          <div
            ref={listRef}
            className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-3 py-4"
          >
            {messages.map((message) => (
              <ChatMessageBubble
                key={message.id}
                role={message.role}
                content={message.content}
                createdAt={message.createdAt}
              />
            ))}

            {isTyping && (
              <div className="flex justify-start gap-3">
                <div className="mt-1 hidden h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 sm:inline-flex">
                  <FontAwesomeIcon icon={faRobot} />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 bg-white p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-end gap-2"
            >
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite sua pergunta..."
                className="min-h-[46px] max-h-[140px] flex-1 resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />

              <button
                type="submit"
                onMouseDown={(e) => e.preventDefault()}
                disabled={!canSend}
                className="inline-flex h-[46px] w-[46px] items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                title="Enviar"
              >
                <FontAwesomeIcon icon={faPaperPlane} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default ChatBot;