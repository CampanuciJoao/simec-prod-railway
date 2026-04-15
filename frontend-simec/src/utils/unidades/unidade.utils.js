export function formatarEndereco(unidade) {
  if (!unidade?.logradouro) return 'Endereço não cadastrado';

  const parts = [
    `${unidade.logradouro}, ${unidade.numero || 'S/N'}`,
    unidade.complemento,
    unidade.bairro,
    `${unidade.cidade || ''}${unidade.estado ? ` - ${unidade.estado}` : ''}`,
    unidade.cep ? `CEP: ${unidade.cep}` : '',
  ];

  return parts.filter(Boolean).join(', ');
}