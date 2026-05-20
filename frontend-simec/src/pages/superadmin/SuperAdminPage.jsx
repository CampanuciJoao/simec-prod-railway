import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBookOpen,
  faBuildingShield,
  faClockRotateLeft,
  faHeartPulse,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';

import { PageHeader, PageLayout, ResponsiveTabs } from '@/components/ui';

function SuperAdminPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    {
      id: 'tenants',
      label: 'Clientes',
      icon: <FontAwesomeIcon icon={faBuildingShield} />,
      path: '/superadmin/tenants',
    },
    {
      id: 'usuarios',
      label: 'Usuários',
      icon: <FontAwesomeIcon icon={faUsers} />,
      path: '/superadmin/usuarios',
    },
    {
      id: 'auditoria',
      label: 'Auditoria',
      icon: <FontAwesomeIcon icon={faClockRotateLeft} />,
      path: '/superadmin/auditoria',
    },
    {
      id: 'saude',
      label: 'Saúde do sistema',
      icon: <FontAwesomeIcon icon={faHeartPulse} />,
      path: '/superadmin/saude',
    },
    {
      id: 'ajuda',
      label: 'Base de ajuda',
      icon: <FontAwesomeIcon icon={faBookOpen} />,
      path: '/superadmin/ajuda',
    },
  ];

  const activeTab =
    tabs.find((tab) => location.pathname.startsWith(tab.path))?.id || 'tenants';

  return (
    <PageLayout padded fullHeight>
      <div className="space-y-6">
        <PageHeader
          title="Superadmin"
          subtitle="Backoffice global do SaaS para operar clientes, conteudo e governanca central."
          icon={faBuildingShield}
        />

        <ResponsiveTabs
          tabs={tabs.map((tab) => ({
            id: tab.id,
            label: tab.label,
            icon: tab.icon,
          }))}
          activeTab={activeTab}
          onChange={(tabId) => {
            const selected = tabs.find((item) => item.id === tabId);
            if (selected) navigate(selected.path);
          }}
        />

        <Outlet />
      </div>
    </PageLayout>
  );
}

export default SuperAdminPage;
