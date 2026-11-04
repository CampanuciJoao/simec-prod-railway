import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGears, faBrain } from '@fortawesome/free-solid-svg-icons';

import { ResponsiveTabs } from '@/components/ui';

import GehcConfiguracaoTab from './integracoes/GehcConfiguracaoTab';
import GehcAprendizadoTab from './integracoes/GehcAprendizadoTab';
import EnergiaSolarTab from './integracoes/EnergiaSolarTab';

// Página Gerenciamento › Integrações.
//
// Lista de provedores no topo. Cada um tem sua propria UI de configuracao.
// GE Healthcare tem duas sub-abas (Configuracao + Aprendizado da IA).
// Energia Solar e generico (multi-fabricante) — o fabricante vira dropdown
// dentro do form de adicionar inversor.

const SUBABAS_GEHC = [
  { id: 'configuracao', label: 'Configuração',     icon: <FontAwesomeIcon icon={faGears} /> },
  { id: 'aprendizado',  label: 'Aprendizado da IA', icon: <FontAwesomeIcon icon={faBrain} /> },
];

const PROVEDORES = [
  { id: 'gehc',  label: 'GE Healthcare' },
  { id: 'solar', label: 'Energia Solar' },
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
      <ResponsiveTabs
        tabs={PROVEDORES.map((p) => ({ id: p.id, label: p.label }))}
        activeTab={provedor}
        onChange={setProvedor}
      />

      {provedor === 'gehc'  && <GehcSubAbas />}
      {provedor === 'solar' && <EnergiaSolarTab />}
    </div>
  );
}

export default IntegracoesPage;
