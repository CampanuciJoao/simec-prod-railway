import { useState, useCallback } from 'react';
import { sendMessageToAgent } from '@/services/chat/chatAdapter';
import { interpretarRespostaAgente } from '@/services/chat/chatResponseInterpreter';

function formatTime(date = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function useChat() {
  const [messages, setMessages] = useState([
    {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'Olá. Eu sou o **T.H.I.A.G.O**.\n\nComo posso ajudar você?',
      createdAt: formatTime(),
    },
  ]);

  const [isTyping, setIsTyping] = useState(false);

  const appendMessage = useCallback((role, content) => {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role,
        content,
        createdAt: formatTime(),
      },
    ]);
  }, []);

  const sendMessage = useCallback(
    async (text) => {
      const mensagem = text.trim();
      if (!mensagem || isTyping) return;

      appendMessage('user', mensagem);
      setIsTyping(true);

      try {
        const response = await sendMessageToAgent({
          mensagem,
          messages,
        });

        const parsed = interpretarRespostaAgente(response);

        appendMessage('assistant', parsed.mensagem);

        // 🔥 aqui começa o diferencial da sua arquitetura
        if (parsed.acao) {
          console.log('[CHAT_ACTION]', parsed.acao, parsed.contexto);
          // futuramente: router de ações (abrir OS, gerar PDF, etc)
        }

      } catch {
        appendMessage('assistant', 'Erro ao responder. Tente novamente.');
      } finally {
        setIsTyping(false);
      }
    },
    [messages, isTyping, appendMessage]
  );

  return {
    messages,
    isTyping,
    sendMessage,
  };
}