import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClipboardCheck,
  faList,
  faTrashRestore,
  faFileImport,
} from '@fortawesome/free-solid-svg-icons';

import {
  PageLayout,
  PageHeader,
  ResponsiveTabs,
} from '@/components/ui';

import CatalogoTab from '@/components/controleQualidade/CatalogoTab';
import ExcluidosTab from '@/components/controleQualidade/ExcluidosTab';
import ImportarLoteCqPanel from '@/components/controleQualidade/ImportarLoteCqPanel';

const TABS = [
  { id: 'catalogo', label: 'Catálogo de tipos', icon: <FontAwesomeIcon icon={faList} /> },
  { id: 'importar', label: 'Importar histórico (lote)', icon: <FontAwesomeIcon icon={faFileImport} /> },
  { id: 'excluidos', label: 'Registros excluídos', icon: <FontAwesomeIcon icon={faTrashRestore} /> },
];

function ControleQualidadeAdminPage() {
  const [activeTab, setActiveTab] = useState('catalogo');

  return (
    <PageLayout padded fullHeight>
      <div className="space-y-6">
        <PageHeader
          title="Controle de Qualidade — Configurações"
          subtitle="Catálogo de tipos de teste (RDC 611/2022 + IN 90/2021) e restauração de registros excluídos."
          icon={faClipboardCheck}
        />

        <ResponsiveTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === 'catalogo' ? <CatalogoTab /> : null}
        {activeTab === 'importar' ? <ImportarLoteCqPanel /> : null}
        {activeTab === 'excluidos' ? <ExcluidosTab /> : null}
      </div>
    </PageLayout>
  );
}

export default ControleQualidadeAdminPage;
