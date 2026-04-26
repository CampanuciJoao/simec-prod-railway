import {
  faTachometerAlt,
  faFileContract,
  faExclamationTriangle,
  faWrench,
  faChartLine,
  faShieldAlt,
  faCogs,
  faPlus,
  faMicrochip,
  faChartBar,
  faLifeRing,
  faBuildingShield,
  faFileInvoiceDollar,
} from '@fortawesome/free-solid-svg-icons';

export const sidebarConfig = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: faTachometerAlt,
  },
  {
    label: 'Cadastros Gerais',
    path: '/cadastros',
    icon: faPlus,
  },
  {
    label: 'Equipamentos',
    path: '/equipamentos',
    icon: faMicrochip,
  },
  {
    label: 'Contratos',
    path: '/contratos',
    icon: faFileContract,
  },
  {
    label: 'Seguros',
    path: '/seguros',
    icon: faShieldAlt,
  },
  {
    label: 'Alertas',
    path: '/alertas',
    icon: faExclamationTriangle,
    showBadge: true,
  },
  {
    label: 'Manutencoes',
    path: '/manutencoes',
    icon: faWrench,
  },
  {
    label: 'Indicadores BI',
    path: '/bi',
    icon: faChartBar,
  },
  {
    label: 'Orçamentos',
    path: '/orcamentos',
    icon: faFileInvoiceDollar,
  },
  {
    label: 'Relatorios',
    path: '/relatorios',
    icon: faChartLine,
  },
  {
    label: 'Ajuda',
    path: '/ajuda',
    icon: faLifeRing,
  },
  {
    label: 'Gerenciamento',
    path: '/gerenciamento',
    icon: faCogs,
    roles: ['admin', 'superadmin'],
    section: 'admin',
  },
  {
    label: 'Superadmin',
    path: '/superadmin',
    icon: faBuildingShield,
    roles: ['superadmin'],
    section: 'admin',
  },
];
