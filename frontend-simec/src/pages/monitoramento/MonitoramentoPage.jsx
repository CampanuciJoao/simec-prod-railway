import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeartPulse, faBoltLightning } from '@fortawesome/free-solid-svg-icons';

import { PageLayout, PageHeader, ResponsiveTabs } from '@/components/ui';

import TabEnergia from '@/components/monitoramento/TabEnergia';
import TabSaudeGehc from '@/components/monitoramento/TabSaudeGehc';

const TABS = [
  { id: 'saude',   label: 'Saúde dos Equipamentos', icon: <FontAwesomeIcon icon={faHeartPulse}    /> },
  { id: 'energia', label: 'Energia',                 icon: <FontAwesomeIcon icon={faBoltLightning} /> },
];

const ABAS_VALIDAS = new Set(TABS.map((t) => t.id));

function MonitoramentoPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const aba = ABAS_VALIDAS.has(rawTab) ? rawTab : 'saude';

  const handleTabChange = (next) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'saude') {
      params.delete('tab');
      params.delete('plantId');
    } else {
      params.set('tab', next);
    }
    setSearchParams(params, { replace: false });
  };

  return (
    <PageLayout padded>
      <div className="flex flex-col gap-5">
        <PageHeader
          icon={faHeartPulse}
          title="Monitoramento"
          subtitle="Saúde dos equipamentos e sistema de energia solar/backup"
        />

        <ResponsiveTabs tabs={TABS} activeTab={aba} onChange={handleTabChange} />

        <div>
          {aba === 'saude' && <TabSaudeGehc />}
          {aba === 'energia' && <TabEnergia />}
        </div>
      </div>
    </PageLayout>
  );
}

export default MonitoramentoPage;
