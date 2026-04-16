// src/services/chat/chatActionHandler.js

export function handleChatAction({
  acao,
  contexto,
  meta,
  navigate,
  addToast,
}) {
  if (!acao) return;

  switch (acao) {
    /**
     * =========================
     * MANUTENÇÃO
     * =========================
     */
    case 'ABRIR_AGENDAMENTO':
      navigate('/manutencoes/agendar');
      break;

    case 'VER_MANUTENCAO':
      if (contexto?.id) {
        navigate(`/manutencoes/${contexto.id}`);
      }
      break;

    /**
     * =========================
     * RELATÓRIOS
     * =========================
     */
    case 'GERAR_RELATORIO':
      navigate('/relatorios', {
        state: { filtros: contexto },
      });
      break;

    /**
     * =========================
     * SEGUROS
     * =========================
     */
    case 'VER_SEGURO':
      if (contexto?.id) {
        navigate(`/seguros/${contexto.id}`);
      }
      break;

    /**
     * =========================
     * PDF
     * =========================
     */
    case 'GERAR_PDF':
      if (contexto?.url) {
        window.open(contexto.url, '_blank');
      }
      break;

    /**
     * =========================
     * ALERTAS / FEEDBACK
     * =========================
     */
    case 'NOTIFICAR':
      if (meta?.mensagem) {
        addToast(meta.mensagem, meta.tipo || 'info');
      }
      break;

    /**
     * =========================
     * DEFAULT
     * =========================
     */
    default:
      console.warn('[CHAT_ACTION] Ação não tratada:', acao);
      break;
  }
}