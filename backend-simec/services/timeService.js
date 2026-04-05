// Ficheiro: services/timeService.js
// VERSÃO FINAL - COM DETECÇÃO AUTOMÁTICA DE AMBIENTE

/**
 * Retorna o "agora" do sistema.
 * Em produção (NODE_ENV=production), usa o relógio do servidor.
 * Em desenvolvimento/testes, usa uma data fixa para consistência.
 */
export function getAgora() {
  // Verifica a variável de ambiente definida no .env ou no servidor
  const isProduction = process.env.NODE_ENV === 'production';
  
  // A data mockada para testes (Junho de 2025)
  const MOCK_DATE_UTC = '2025-06-06T13:36:00.000Z';

  if (isProduction) {
    return new Date();
  }
  
  console.log('[TimeService] Modo de desenvolvimento: Usando data mockada.');
  return new Date(MOCK_DATE_UTC);
}