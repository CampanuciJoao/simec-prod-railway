import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeartPulse } from '@fortawesome/free-solid-svg-icons';

import { Card } from '@/components/ui';

// Placeholder da aba Saude dos Equipamentos. Na Fase 3 recebe o
// dashboard visual consolidado dos RMs GE + alertas abertos. Por
// enquanto o monitoramento visual continua em /equipamentos/:id/saude.
function TabSaudeGehc() {
  return (
    <Card className="p-8 text-center">
      <FontAwesomeIcon icon={faHeartPulse} className="mb-3 text-4xl" style={{ color: 'var(--text-muted)' }} />
      <p className="text-lg font-semibold">Dashboard de saúde consolidado</p>
      <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
        Em breve: visão unificada da saúde das RMs GE com alertas abertos.
        <br />
        Por enquanto, o monitoramento por equipamento continua acessível na página de cada equipamento.
      </p>
    </Card>
  );
}

export default TabSaudeGehc;
