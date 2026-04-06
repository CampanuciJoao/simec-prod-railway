// Ficheiro: backend-simec/services/timeService.js
// VERSÃO FINAL - FORÇANDO O FUSO HORÁRIO DE MATO GROSSO DO SUL (UTC-4)

/**
 * Retorna um objeto Date que representa o "agora" exato do sistema,
 * ancorado no fuso horário de Mato Grosso do Sul (America/Campo_Grande),
 * independentemente de onde o servidor físico (Railway, AWS) esteja hospedado.
 */
export function getAgora() {
  // Pega a data/hora bruta do servidor (geralmente UTC)
  const dataServidor = new Date();

  // Converte a data do servidor para uma string baseada no fuso de MS
  const dataHoraMS_String = dataServidor.toLocaleString('en-US', { 
    timeZone: 'America/Campo_Grande',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false // Força o formato 24h
  });

  // A string retornada será algo como "04/12/2024, 15:30:00"
  // Precisamos reagrupar isso para o formato que o "new Date()" entende (YYYY-MM-DDTHH:mm:ss)
  
  const [dataPart, horaPart] = dataHoraMS_String.split(', ');
  const [mes, dia, ano] = dataPart.split('/'); // No padrão 'en-US' vem MM/DD/YYYY
  
  const dataLocalReal = new Date(`${ano}-${mes}-${dia}T${horaPart}`);

  return dataLocalReal;
}