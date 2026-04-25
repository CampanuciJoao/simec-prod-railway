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

export function formatarCnpj(cnpj) {
  const digits = String(cnpj || '').replace(/\D/g, '');

  if (digits.length !== 14) return cnpj || 'Não informado';

  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}
