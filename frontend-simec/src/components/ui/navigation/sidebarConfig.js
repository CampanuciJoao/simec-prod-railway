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
    label: 'Equipamentos',
    path: '/equipamentos',
    icon: faMicrochip,
  },
  {
    label: 'Manutenções',
    path: '/manutencoes',
    icon: faWrench,
  },
  {
    label: 'Alertas',
    path: '/alertas',
    icon: faExclamationTriangle,
    showBadge: true,
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
    label: 'Relatórios',
    path: '/relatorios',
    icon: faChartLine,
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
