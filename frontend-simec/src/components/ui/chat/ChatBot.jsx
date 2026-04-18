import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCommentDots,
  faRobot,
  faXmark,
  faRotateRight,
} from '@fortawesome/free-solid-svg-icons';

import ChatMessageBubble from '@/components/ui/chat/ChatMessageBubble';
import { useChat } from '@/hooks/chat/useChat';

function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);

  const { messages, sendMessage, resetChat } = useChat();

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[80] h-14 w-14 rounded-full bg-blue-600 text-white"
        >
          <FontAwesomeIcon icon={faCommentDots} />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-[80] flex h-[72vh] w-[420px] flex-col rounded-3xl bg-white shadow-2xl">

          {/* HEADER */}
          <div className="flex justify-between bg-slate-900 p-4 text-white">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faRobot} />
              <span>T.H.I.A.G.O</span>
            </div>

            <div className="flex gap-2">
              <button onClick={resetChat}>
                <FontAwesomeIcon icon={faRotateRight} />
              </button>

              <button onClick={() => setIsOpen(false)}>
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
          </div>

          {/* MESSAGES */}
          <div className="flex-1 overflow-y-auto p-3">
            {messages.map((m) => (
              <ChatMessageBubble key={m.id} {...m} />
            ))}
          </div>

          {/* INPUT SIMPLES (por enquanto) */}
          <div className="p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const value = e.target.elements.msg.value;
                sendMessage(value);
                e.target.reset();
              }}
            >
              <input
                name="msg"
                className="w-full rounded-xl border p-2"
                placeholder="Digite..."
              />
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default ChatBot;
