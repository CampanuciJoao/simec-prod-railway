export const buildResumoConfirmacao = (estado) => {
  const dataFmt = estado.data ? estado.data.split('-').reverse().join('/') : '';
  const linhas = [
    '📋 **Resumo para agendamento**',
    `- **Ativo:** ${estado.equipamentoNome || estado.modelo || estado.tipoEquipamento || 'Equipamento não resolvido'} (Tag: ${estado.tag || 'sem tag'})`,
    `- **Local:** ${estado.unidadeNome || 'Unidade não resolvida'}`,
    `- **Tipo de manutenção:** ${estado.tipoManutencao || 'Não informado'}`,
    `- **Horário:** ${dataFmt} | das ${estado.horaInicio} às ${estado.horaFim}`,
  ];

  if (estado.tipoEquipamento) {
    linhas.push(`- **Categoria do equipamento:** ${estado.tipoEquipamento}`);
  }

  if (estado.tipoManutencao === 'Corretiva' && estado.numeroChamado) {
    linhas.push(`- **Chamado:** ${estado.numeroChamado}`);
  }

  if (estado.descricao) {
    linhas.push(`- **Descrição:** ${estado.descricao}`);
  }

  linhas.push(
    '',
    '**Confirma a criação desta manutenção?** (Responda **Sim** ou **Não**)'
  );

  return linhas.join('\n');
};
