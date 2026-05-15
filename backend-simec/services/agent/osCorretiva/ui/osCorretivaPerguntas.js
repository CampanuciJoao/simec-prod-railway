const MAPA_PERGUNTAS_ABRIR = {
  equipamentoId: 'Para qual equipamento deseja registrar a ocorrência? Informe o modelo ou TAG.',
  descricaoProblema: 'Qual é o problema observado no equipamento?',
  statusEquipamentoAbertura: 'Qual o status atual do equipamento?\n1. **Inoperante** (parado, não funciona)\n2. **Uso Limitado** (funcionando parcialmente)\n3. **Em Manutenção** (aguardando revisão)\n4. **Operante** (problema intermitente, equipamento já voltou ao normal — fica em observação)',
};

const MAPA_PERGUNTAS_VISITA = {
  equipamentoId: 'Para qual equipamento deseja agendar a visita? Informe o modelo ou TAG.',
  osId: 'Qual OS você quer agendar a visita? Informe o número da OS.',
  prestadorNome: 'Qual o nome do prestador ou empresa que realizará a visita?',
  data: 'Qual a data da visita? (formato DD/MM/AAAA ou "amanhã")',
  horaInicio: 'Qual o horário de início da visita? (ex: 14:00)',
  horaFim: 'Qual o horário de término previsto? (ex: 16:00)',
};

export function proximaPerguntaOs(fluxo, faltantes) {
  const mapa = fluxo === 'ABRIR_OS' ? MAPA_PERGUNTAS_ABRIR : MAPA_PERGUNTAS_VISITA;
  const campo = faltantes[0];
  return mapa[campo] || 'Pode me fornecer mais informações?';
}

export function formatarListaOsAbertas(osesAbertas) {
  if (!osesAbertas?.length) return '';
  const linhas = osesAbertas.map((os, i) => {
    const status = os.status === 'AguardandoTerceiro' ? 'Aguardando Terceiro' : os.status;
    const descricao = os.descricaoProblema ? ` — "${os.descricaoProblema.slice(0, 60)}${os.descricaoProblema.length > 60 ? '...' : ''}"` : '';
    return `**${i + 1}.** ${os.numeroOS} (${status})${descricao}`;
  });
  return linhas.join('\n');
}

export function formatarStatusOpcoes() {
  return '**1.** Inoperante\n**2.** Uso Limitado\n**3.** Em Manutenção\n**4.** Operante (em observação)';
}
