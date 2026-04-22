import React, { Suspense, lazy, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot } from '@fortawesome/free-solid-svg-icons';

const ChatPanel = lazy(() => import('@/components/ui/chat/ChatPanel'));

function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);

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

      {isOpen ? (
        <Suspense
          fallback={
            <div className="fixed inset-x-3 bottom-3 top-20 z-[80] flex items-center justify-center overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto sm:h-[72vh] sm:max-h-[760px] sm:w-[420px]">
              <div className="text-sm font-medium text-slate-500">
                Carregando agente...
              </div>
            </div>
          }
        >
          <ChatPanel onClose={() => setIsOpen(false)} />
        </Suspense>
      ) : null}
    </>
  );
}

export default ChatBot;
