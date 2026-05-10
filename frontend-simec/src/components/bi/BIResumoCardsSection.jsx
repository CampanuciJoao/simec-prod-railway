import React from 'react';
import {
  faClock,
  faHospital,
  faMicrochip,
  faShieldHeart,
  faTriangleExclamation,
  faStopwatch,
  faRotate,
} from '@fortawesome/free-solid-svg-icons';

import { ResponsiveGrid } from '@/components/ui';
import { InteractiveKpiCard } from '@/components/bi';

function BIResumoCardsSection({ resumoCards, onOpenDrawer }) {
  return (
    <ResponsiveGrid cols={{ base: 1, sm: 2, md: 4, xl: 7 }}>
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

      <InteractiveKpiCard
        icon={faStopwatch}
        title="Tempo médio de resolução"
        value={resumoCards.mttr}
        subtitle="Da abertura até a conclusão (OS corretivas)"
        tone="red"
      />

      <InteractiveKpiCard
        icon={faRotate}
        title="MTBF"
        value={resumoCards.mtbf}
        subtitle="Tempo médio entre falhas corretivas"
        tone="blue"
      />
    </ResponsiveGrid>
  );
}

export default BIResumoCardsSection;
