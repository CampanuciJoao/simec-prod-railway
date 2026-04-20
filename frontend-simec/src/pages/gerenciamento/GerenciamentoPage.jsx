import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUsersCog,
  faScroll,
  faCogs,
  faBuilding,
} from '@fortawesome/free-solid-svg-icons';

import { PageLayout, PageHeader, ResponsiveTabs } from '@/components/ui';

function GerenciamentoPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    {
      id: 'usuarios',
      label: 'Usuarios',
      icon: <FontAwesomeIcon icon={faUsersCog} />,
      path: '/gerenciamento/usuarios',
    },
    {
      id: 'empresa',
      label: 'Empresa',
      icon: <FontAwesomeIcon icon={faBuilding} />,
      path: '/gerenciamento/empresa',
    },
    {
      id: 'auditoria',
      label: 'Log de auditoria',
      icon: <FontAwesomeIcon icon={faScroll} />,
      path: '/gerenciamento/auditoria',
    },
  ];

  const activeTab =
    tabs.find((tab) => location.pathname.startsWith(tab.path))?.id || 'usuarios';

  const handleChangeTab = (tabId) => {
    const selectedTab = tabs.find((tab) => tab.id === tabId);
    if (selectedTab) navigate(selectedTab.path);
  };

  return (
    <PageLayout padded fullHeight>
      <div className="space-y-6">
        <PageHeader
          title="Gerenciamento"
          subtitle="Governanca do tenant com usuarios, empresa e auditoria."
          icon={faCogs}
        />

        <ResponsiveTabs
          tabs={tabs.map((tab) => ({
            id: tab.id,
            label: tab.label,
            icon: tab.icon,
          }))}
          activeTab={activeTab}
          onChange={handleChangeTab}
        />

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </PageLayout>
  );
}

export default GerenciamentoPage;
