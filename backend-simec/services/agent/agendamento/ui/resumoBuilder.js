export const buildResumoConfirmacao = (estado) => {
  const dataFmt = estado.data ? estado.data.split('-').reverse().join('/') : '';

  return `📋 **Resumo para Agendamento**
- **Ativo:** ${estado.equipamentoNome || estado.modelo || estado.tipoEquipamento || 'Equipamento não resolvido'} (Tag: ${estado.tag || 'sem tag'})
- **Local:** ${estado.unidadeNome || 'Unidade não resolvida'}
- **Tipo de Manutenção:** ${estado.tipoManutencao || 'Não informado'}
- **Categoria do Equipamento:** ${estado.tipoEquipamento || 'Não informado'}
- **Horário:** ${dataFmt} | das ${estado.horaInicio} às ${estado.horaFim}
${estado.tipoManutencao === 'Corretiva' ? `- **Chamado:** ${estado.numeroChamado}` : ''}

**Confirma a criação desta manutenção?** (Responda **Sim** ou **Não**)`;
};