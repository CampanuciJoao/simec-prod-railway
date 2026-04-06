// Ficheiro: backend-simec/services/timeService.js
// VERSÃO DEFINITIVA - CORREÇÃO DE CONSTRUÇÃO DE DATA

/**
 * Retorna um objeto Date que representa o "agora" exato para o fuso de Mato Grosso do Sul (UTC-4).
 * Esta versão corrige a construção da data para garantir que o Javascript não 
 * "re-interprete" o fuso horário após a criação do objeto.
 */
export function getAgora() {
  // 1. Pega o tempo atual em MS (Campo Grande) usando toLocaleString
  const options = {
    timeZone: 'America/Campo_Grande',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };

  const formatter = new Intl.DateTimeFormat('en-US', options);
  const partes = formatter.formatToParts(new Date());
  
  // Extrai as partes para montar a data manualmente sem conversão de fuso do JS
  const p = {};
  partes.forEach(({ type, value }) => { p[type] = value; });

  // Retorna um novo objeto Date montado manualmente. 
  // Nota: O mês no construtor do Date é base 0 (janeiro = 0), por isso o -1.
  return new Date(
    p.year,
    p.month - 1,
    p.day,
    p.hour === '24' ? 0 : p.hour,
    p.minute,
    p.second
  );
}