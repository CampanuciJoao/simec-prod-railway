import React from 'react';
import {
  faClock,
  faHospital,
  faMicrochip,
  faShieldHeart,
  faTriangleExclamation,
  faStopwatch,
  faCalendarCheck,
  faListCheck,
} from '@fortawesome/free-solid-svg-icons';

import { ResponsiveGrid } from '@/components/ui';
import { InteractiveKpiCard } from '@/components/bi';

function BIResumoCardsSection({ resumoCards, onOpenDrawer }) {
  return (
    <div className="space-y-3">
      <ResponsiveGrid cols={{ base: 1, sm: 2, xl: 5 }}>
        <InteractiveKpiCard
          icon={faMicrochip}
          title="Ativos no sistema"
          value={resumoCards.totalAtivos}
          tone="blue"
          onClick={() => onOpenDrawer('ativos')}
        />

        <InteractiveKpiCard
          icon={faShieldHeart}
          title="Preventivas realizadas"
          value={resumoCards.preventivas}
          tone="green"
          onClick={() => onOpenDrawer('preventivas')}
        />

        <InteractiveKpiCard
          icon={faTriangleExclamation}
          title="Falhas corretivas"
          value={resumoCards.corretivas}
          tone="red"
          onClick={() => onOpenDrawer('corretivas')}
        />

        <InteractiveKpiCard
          icon={faClock}
          title="Downtime acumulado"
          value={resumoCards.downtimeAcumulado}
          tone="yellow"
          onClick={() => onOpenDrawer('downtime')}
        />

        <InteractiveKpiCard
          icon={faHospital}
          title="Unidade mais crítica"
          value={resumoCards.unidadeCritica?.nome || '—'}
          tone="slate"
          onClick={() => onOpenDrawer('unidadeCritica')}
        />
      </ResponsiveGrid>

      <ResponsiveGrid cols={{ base: 1, sm: 3 }}>
        <InteractiveKpiCard
          icon={faStopwatch}
          title="MTTR médio"
          value={resumoCards.mttr}
          subtitle="Tempo médio de reparo (OS corretivas)"
          tone="red"
        />

        <InteractiveKpiCard
          icon={faCalendarCheck}
          title="Conformidade PM"
          value={resumoCards.conformidadePM}
          subtitle="Preventivas concluídas no prazo"
          tone="green"
        />

        <InteractiveKpiCard
          icon={faListCheck}
          title="Backlog"
          value={resumoCards.backlog}
          subtitle="Ordens em aberto agora"
          tone="yellow"
        />
      </ResponsiveGrid>
    </div>
  );
}

export default BIResumoCardsSection;
