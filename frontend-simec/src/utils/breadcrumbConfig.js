export function getBreadcrumbItems(pathname = '') {
  const path = String(pathname || '');

  if (path === '/dashboard') {
    return [{ label: 'Dashboard', to: '/dashboard' }];
  }

  if (path === '/cadastros') {
    return [{ label: 'Cadastros Gerais', to: '/cadastros' }];
  }

  if (path.startsWith('/cadastros/unidades/adicionar')) {
    return [
      { label: 'Cadastros Gerais', to: '/cadastros' },
      { label: 'Unidades', to: '/cadastros/unidades' },
      { label: 'Nova Unidade' },
    ];
  }

  if (path.startsWith('/cadastros/unidades/editar')) {
    return [
      { label: 'Cadastros Gerais', to: '/cadastros' },
      { label: 'Unidades', to: '/cadastros/unidades' },
      { label: 'Editar Unidade' },
    ];
  }

  if (path.startsWith('/cadastros/unidades')) {
    return [
      { label: 'Cadastros Gerais', to: '/cadastros' },
      { label: 'Unidades' },
    ];
  }

  if (path.startsWith('/equipamentos/adicionar')) {
    return [
      { label: 'Equipamentos', to: '/equipamentos' },
      { label: 'Novo Equipamento' },
    ];
  }

  if (path.startsWith('/equipamentos/editar')) {
    return [
      { label: 'Equipamentos', to: '/equipamentos' },
      { label: 'Editar Equipamento' },
    ];
  }

  if (path.startsWith('/cadastros/emails')) {
    return [
      { label: 'Cadastros Gerais', to: '/cadastros' },
      { label: 'E-mails de Notificação' },
    ];
  }

  if (path.startsWith('/gerenciamento/usuarios')) {
    return [
      { label: 'Cadastros Gerais', to: '/cadastros' },
      { label: 'Usuários' },
    ];
  }

  if (path === '/equipamentos') {
    return [{ label: 'Equipamentos' }];
  }

  if (path.startsWith('/equipamentos/detalhes/')) {
    return [
      { label: 'Equipamentos', to: '/equipamentos' },
      { label: 'Detalhes do Equipamento' },
    ];
  }

  if (path.startsWith('/equipamentos/ficha-tecnica/')) {
    return [
      { label: 'Equipamentos', to: '/equipamentos' },
      { label: 'Ficha Técnica' },
    ];
  }

  if (path === '/manutencoes') {
    return [{ label: 'Manutenções' }];
  }

  if (path.startsWith('/manutencoes/agendar')) {
    return [
      { label: 'Manutenções', to: '/manutencoes' },
      { label: 'Nova Manutenção' },
    ];
  }

  if (path.startsWith('/manutencoes/editar/')) {
    return [
      { label: 'Manutenções', to: '/manutencoes' },
      { label: 'Editar Manutenção' },
    ];
  }

  if (path.startsWith('/manutencoes/detalhes/')) {
    return [
      { label: 'Manutenções', to: '/manutencoes' },
      { label: 'Detalhes da OS' },
    ];
  }

  if (path === '/contratos') {
    return [{ label: 'Contratos' }];
  }

  if (path.startsWith('/contratos/adicionar')) {
    return [
      { label: 'Contratos', to: '/contratos' },
      { label: 'Novo Contrato' },
    ];
  }

  if (path.startsWith('/contratos/editar/')) {
    return [
      { label: 'Contratos', to: '/contratos' },
      { label: 'Editar Contrato' },
    ];
  }

  if (path.startsWith('/contratos/detalhes/')) {
    return [
      { label: 'Contratos', to: '/contratos' },
      { label: 'Detalhes do Contrato' },
    ];
  }

  if (path === '/seguros') {
    return [{ label: 'Seguros' }];
  }

  if (path.startsWith('/seguros/adicionar')) {
    return [
      { label: 'Seguros', to: '/seguros' },
      { label: 'Novo Seguro' },
    ];
  }

  if (path.startsWith('/seguros/editar/')) {
    return [
      { label: 'Seguros', to: '/seguros' },
      { label: 'Editar Seguro' },
    ];
  }

  if (path.startsWith('/seguros/detalhes/')) {
    return [
      { label: 'Seguros', to: '/seguros' },
      { label: 'Detalhes do Seguro' },
    ];
  }

  if (path === '/alertas') {
    return [{ label: 'Alertas' }];
  }

  if (path === '/bi') {
    return [{ label: 'Business Intelligence' }];
  }

  if (path === '/relatorios') {
    return [{ label: 'Relatórios' }];
  }

  if (path === '/gerenciamento') {
    return [{ label: 'Gerenciamento' }];
  }

  if (path.startsWith('/gerenciamento/auditoria')) {
    return [
      { label: 'Gerenciamento', to: '/gerenciamento' },
      { label: 'Auditoria' },
    ];
  }

  return [];
}
