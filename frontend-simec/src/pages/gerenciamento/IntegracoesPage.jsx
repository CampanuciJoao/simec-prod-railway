import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGears, faBrain } from '@fortawesome/free-solid-svg-icons';

import { ResponsiveTabs } from '@/components/ui';

import GehcConfiguracaoTab from './integracoes/GehcConfiguracaoTab';
import GehcAprendizadoTab from './integracoes/GehcAprendizadoTab';

// Página Gerenciamento › Integrações.
//
// Estrutura preparada para múltiplos provedores: hoje só GE Healthcare aparece
// como aba, mas a arquitetura permite adicionar Canon, Siemens, Philips etc
// como novas entradas em PROVEDORES (cada uma com suas sub-abas próprias).
//
// Cada provedor tem 2 sub-abas:
//   - Configuração (setup, credenciais, vínculo de equipamentos)
//   - Aprendizado da IA (o que a IA capturou e está aprendendo dos dados)

const SUBABAS_GEHC = [
  { id: 'configuracao', label: 'Configuração',     icon: <FontAwesomeIcon icon={faGears} /> },
  { id: 'aprendizado',  label: 'Aprendizado da IA', icon: <FontAwesomeIcon icon={faBrain} /> },
];

const PROVEDORES = [
  { id: 'gehc', label: 'GE Healthcare', subabas: SUBABAS_GEHC },
];

function GehcSubAbas() {
  const [subaba, setSubaba] = useState('configuracao');

  return (
    <div className="space-y-4">
      <ResponsiveTabs
        tabs={SUBABAS_GEHC}
        activeTab={subaba}
        onChange={setSubaba}
      />
      {subaba === 'configuracao' && <GehcConfiguracaoTab />}
      {subaba === 'aprendizado'  && <GehcAprendizadoTab />}
    </div>
  );
}

function IntegracoesPage() {
  const [provedor, setProvedor] = useState(PROVEDORES[0].id);

  return (
    <div className="space-y-4">
      {PROVEDORES.length > 1 && (
        <ResponsiveTabs
          tabs={PROVEDORES.map((p) => ({ id: p.id, label: p.label }))}
          activeTab={provedor}
          onChange={setProvedor}
        />
      )}

      {provedor === 'gehc' && <GehcSubAbas />}
    </div>
  );
}

export default IntegracoesPage;
