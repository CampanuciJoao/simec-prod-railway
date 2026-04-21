import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useToast } from '@/contexts/ToastContext';
import { sendMessageToAgent } from '@/services/chat/chatAdapter';
import { handleChatAction } from '@/services/chat/chatActionHandler';
import { interpretarRespostaAgente } from '@/services/chat/chatResponseInterpreter';
import { resetarSessaoDoAgente } from '@/services/api/agentApi';

function formatTime(date = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function createMessage(role, content, extras = {}) {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: formatTime(),
    meta: extras.meta || null,
    contexto: extras.contexto || null,
  };
}

function getInitialMessages() {
  return [
    createMessage(
      'assistant',
      'Olá. Eu sou o **T.H.I.A.G.O**.\n\nComo posso ajudar você?'
    ),
  ];
}

export function useChat() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [messages, setMessages] = useState(getInitialMessages);
  const [isTyping, setIsTyping] = useState(false);

  const appendMessage = useCallback((role, content, extras = {}) => {
    setMessages((prev) => [...prev, createMessage(role, content, extras)]);
  }, []);

  const sendMessage = useCallback(
    async (text) => {
      const mensagem = text.trim();
      if (!mensagem || isTyping) return;

      const userMessage = createMessage('user', mensagem);
      const nextMessages = [...messages, userMessage];

      setMessages(nextMessages);
      setIsTyping(true);

      try {
        const response = await sendMessageToAgent({
          mensagem,
          messages: nextMessages,
        });

        const parsed = interpretarRespostaAgente(response);

        appendMessage('assistant', parsed.mensagem || 'Não recebi resposta válida.', {
          meta: parsed.meta,
          contexto: parsed.contexto,
        });

        if (parsed.acao) {
          await handleChatAction({
            acao: parsed.acao,
            contexto: parsed.contexto,
            meta: parsed.meta,
            navigate,
            addToast,
          });
        }
      } catch {
        appendMessage('assistant', 'Erro ao responder. Tente novamente.');
      } finally {
        setIsTyping(false);
      }
    },
    [messages, isTyping, appendMessage, navigate, addToast]
  );

  const resetChat = useCallback(async () => {
    if (isTyping) return;

    setIsTyping(true);

    try {
      const response = await resetarSessaoDoAgente();

      setMessages([
        createMessage(
          'assistant',
          response.mensagem || 'Conversa reiniciada. Como posso ajudar você?',
          { meta: response.meta }
        ),
      ]);
    } catch {
      setMessages([
        createMessage(
          'assistant',
          'Não consegui reiniciar a conversa agora. Tente novamente.'
        ),
      ]);
    } finally {
      setIsTyping(false);
    }
  }, [isTyping]);

  return {
    messages,
    isTyping,
    sendMessage,
    resetChat,
  };
}
