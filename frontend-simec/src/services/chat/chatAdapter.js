function formatTime(date = new Date()) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function createMessage({ role, content, createdAt = formatTime() }) {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt,
  };
}

export function createAssistantMessage(content) {
  return createMessage({
    role: 'assistant',
    content,
  });
}

export function createUserMessage(content) {
  return createMessage({
    role: 'user',
    content,
  });
}

export function createWelcomeMessage() {
  return createAssistantMessage(
    'Olá. Eu sou o **T.H.I.A.G.O**.\n\nComo posso ajudar você?'
  );
}

export function createResetMessage() {
  return createAssistantMessage(
    'Conversa reiniciada.\n\nComo posso ajudar?'
  );
}

export { formatTime };