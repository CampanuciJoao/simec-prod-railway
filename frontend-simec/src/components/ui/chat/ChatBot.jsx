import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPaperPlane,
  faRotateRight,
  faRobot,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

import ChatMessageBubble from '@/components/ui/chat/ChatMessageBubble';
import { useChat } from '@/hooks/chat/useChat';

function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, sendMessage, resetChat, isTyping } = useChat();

  return (
    <>
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Abrir agente"
          className="fixed bottom-4 right-4 z-[80] flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-400/30 bg-gradient-to-br from-sky-500 via-cyan-500 to-teal-500 text-white shadow-[0_18px_40px_rgba(14,116,144,0.35)] transition hover:scale-[1.03] hover:shadow-[0_22px_48px_rgba(14,116,144,0.45)] sm:bottom-6 sm:right-6 sm:h-16 sm:w-16"
        >
          <span className="absolute inset-0 rounded-2xl bg-white/10" />
          <FontAwesomeIcon icon={faRobot} className="relative text-xl sm:text-2xl" />
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-x-3 bottom-3 top-20 z-[80] flex flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto sm:h-[72vh] sm:max-h-[760px] sm:w-[420px]">
          <div className="flex items-center justify-between bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950 px-4 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-cyan-100">
                <FontAwesomeIcon icon={faRobot} />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-[0.2em] text-cyan-100/80">
                  AGENTE
                </p>
                <p className="truncate text-base font-semibold text-white">
                  T.H.I.A.G.O
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void resetChat();
                }}
                aria-label="Reiniciar conversa"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
              >
                <FontAwesomeIcon icon={faRotateRight} />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Fechar agente"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50/80 px-3 py-3 sm:px-4">
            <div className="space-y-3">
              {messages.map((m) => (
                <ChatMessageBubble
                  key={m.id}
                  {...m}
                  onSelectSuggestion={(value) => sendMessage(value)}
                />
              ))}

              {isTyping && (
                <div className="flex items-center gap-2 px-2 text-sm text-slate-500">
                  <span className="flex h-2 w-2 rounded-full bg-cyan-500" />
                  <span>O agente está digitando...</span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 bg-white p-3 sm:p-4">
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const value = e.target.elements.msg.value;
                sendMessage(value);
                e.target.reset();
              }}
            >
              <input
                name="msg"
                className="min-h-[48px] flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white focus:ring-2 focus:ring-cyan-100"
                placeholder="Digite sua mensagem..."
              />

              <button
                type="submit"
                aria-label="Enviar mensagem"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-600 text-white transition hover:bg-cyan-700"
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
