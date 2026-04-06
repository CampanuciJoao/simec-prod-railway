// Ficheiro: backend-simec/services/timeService.js
// VERSÃO DEFINITIVA E OTIMIZADA

/**
 * Retorna um objeto Date que representa o "agora" exato.
 * Como definimos a variável de ambiente TZ=America/Campo_Grande no Railway,
 * o próprio ambiente do Node.js já tratará o 'new Date()' no fuso correto.
 */
export function getAgora() {
  // Apenas retornando new Date(), o Node.js respeitará a variável TZ definida no Railway.
  // Isso é o padrão ouro para aplicações servidoras modernas.
  const agora = new Date();
  
  // Apenas uma trava de segurança: garante que o fuso seja respeitado se 
  // o servidor por algum motivo não ler a variável de ambiente (fallback).
  return new Date(agora.toLocaleString("en-US", { timeZone: "America/Campo_Grande" }));
}