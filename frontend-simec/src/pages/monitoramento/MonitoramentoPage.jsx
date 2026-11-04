import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeartPulse, faBoltLightning } from '@fortawesome/free-solid-svg-icons';

import { PageLayout, PageHeader, ResponsiveTabs } from '@/components/ui';

import TabEnergia from '@/components/monitoramento/TabEnergia';
import TabSaudeGehc from '@/components/monitoramento/TabSaudeGehc';

const TABS = [
  { id: 'saude',   label: 'Saúde dos Equipamentos', icon: <FontAwesomeIcon icon={faHeartPulse}    /> },
  { id: 'energia', label: 'Energia',                 icon: <FontAwesomeIcon icon={faBoltLightning} /> },
];

function MonitoramentoPage() {
  const [aba, setAba] = useState('saude');

  return (
    <PageLayout padded>
      <div className="flex flex-col gap-5">
        <PageHeader
          icon={faHeartPulse}
          title="Monitoramento"
          subtitle="Saúde dos equipamentos e sistema de energia solar/backup"
        />

        <ResponsiveTabs tabs={TABS} activeTab={aba} onChange={setAba} />

        <div>
          {aba === 'saude' && <TabSaudeGehc />}
          {aba === 'energia' && <TabEnergia />}
        </div>
      </div>
    </PageLayout>
  );
}

export default MonitoramentoPage;
