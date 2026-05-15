import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faExclamationTriangle,
  faPlus,
  faWrench,
} from '@fortawesome/free-solid-svg-icons';

// CONTEXT / HOOKS
import { useAuth } from '@/contexts/AuthContext';
import { useTabManutencoes } from '@/hooks/manutencoes/useTabManutencoes';
import { useTabOcorrencias } from '@/hooks/manutencoes/useTabOcorrencias';

// DOMAIN
import {
  ManutencoesTab,
  OcorrenciasTab,
  ModalConfirmacaoManutencao,
} from '@/components/manutencoes';

// UI
import {
  Button,
  ModalConfirmacao,
  PageHeader,
  PageLayout,
  ResponsiveTabs,
} from '@/components/ui';

const TAB_IDS = {
  MANUTENCOES: 'manutencoes',
  OCORRENCIAS: 'ocorrencias',
};

const VALID_TABS = new Set(Object.values(TAB_IDS));

function ManutencoesPage() {
  const { usuario } = useAuth();
  const isAdmin = usuario?.role === 'admin';

  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const activeTab = VALID_TABS.has(rawTab) ? rawTab : TAB_IDS.MANUTENCOES;

  const handleTabChange = (tabId) => {
    const next = new URLSearchParams(searchParams);
    if (tabId === TAB_IDS.MANUTENCOES) {
      next.delete('tab');
    } else {
      next.set('tab', tabId);
    }
    setSearchParams(next, { replace: false });
  };

  const tabManutencoes = useTabManutencoes();
  const tabOcorrencias = useTabOcorrencias();

  const headerActions =
    activeTab === TAB_IDS.OCORRENCIAS ? (
      <Button
        type="button"
        onClick={tabOcorrencias.goToCreate}
        className="w-full sm:w-auto justify-center"
      >
        <FontAwesomeIcon icon={faExclamationTriangle} />
        Registrar ocorrência
      </Button>
    ) : (
      <Button
        type="button"
        onClick={tabManutencoes.goToCreate}
        className="w-full sm:w-auto justify-center"
      >
        <FontAwesomeIcon icon={faPlus} />
        Agendar nova
      </Button>
    );

  const tabs = [
    {
      id: TAB_IDS.MANUTENCOES,
      label: 'Manutenções',
      badge: tabManutencoes.metricas?.total ?? 0,
    },
    {
      id: TAB_IDS.OCORRENCIAS,
      label: 'Ocorrências',
      badge: tabOcorrencias.metricas?.total ?? 0,
    },
  ];

  // Delete handlers — refazem refetch das DUAS abas para que a migração
  // entre Ocorrência ↔ Corretiva (após ações) reflita nos contadores das tabs.
  const handleConfirmDeleteManutencao = async () => {
    const id = tabManutencoes.deleteModal.modalData?.id;
    if (!id) return;
    try {
      await tabManutencoes.removerManutencao(id);
      tabManutencoes.deleteModal.closeModal();
      tabOcorrencias.refetch?.();
    } catch {
      // toast tratado dentro do hook
    }
  };

  const handleConfirmDeleteOsManutencoes = async () => {
    const id = tabManutencoes.deleteModal.modalData?.id;
    if (!id) return;
    try {
      await tabManutencoes.removerOs(id);
      tabManutencoes.deleteModal.closeModal();
      tabOcorrencias.refetch?.();
    } catch {
      // toast tratado
    }
  };

  const handleConfirmDeleteOsOcorrencias = async () => {
    const id = tabOcorrencias.deleteModal.modalData?.id;
    if (!id) return;
    try {
      await tabOcorrencias.removerOs(id);
      tabOcorrencias.deleteModal.closeModal();
      tabManutencoes.refetch?.();
    } catch {
      // toast tratado
    }
  };

  // Discrimina pelo _kind injetado nos items unificados pelos hooks de tab.
  const isDeleteModalManutencao =
    tabManutencoes.deleteModal.isOpen &&
    tabManutencoes.deleteModal.modalData?._kind === 'manutencao';

  const isDeleteModalOsCorretivaNaAbaManutencoes =
    tabManutencoes.deleteModal.isOpen &&
    tabManutencoes.deleteModal.modalData?._kind === 'osCorretiva';

  return (
    <>
      {/* Modal: confirmar exclusão de Manutencao (aba Manutenções) */}
      <ModalConfirmacaoManutencao
        isOpen={isDeleteModalManutencao}
        onClose={tabManutencoes.deleteModal.closeModal}
        onConfirm={handleConfirmDeleteManutencao}
        manutencao={tabManutencoes.deleteModal.modalData}
      />

      {/* Modal: confirmar exclusão de OsCorretiva (aba Manutenções — tipo=Corretiva) */}
      <ModalConfirmacao
        isOpen={isDeleteModalOsCorretivaNaAbaManutencoes}
        onClose={tabManutencoes.deleteModal.closeModal}
        onConfirm={handleConfirmDeleteOsManutencoes}
        title="Excluir OS Corretiva"
        message={`Deseja excluir a OS ${tabManutencoes.deleteModal.modalData?.numeroOS}? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        isDestructive
      />

      {/* Modal: confirmar exclusão de OsCorretiva (aba Ocorrências — tipo=Ocorrencia) */}
      <ModalConfirmacao
        isOpen={tabOcorrencias.deleteModal.isOpen}
        onClose={tabOcorrencias.deleteModal.closeModal}
        onConfirm={handleConfirmDeleteOsOcorrencias}
        title="Excluir ocorrência"
        message={`Deseja excluir a ocorrência ${tabOcorrencias.deleteModal.modalData?.numeroOS}? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        isDestructive
      />

      <PageLayout padded fullHeight>
        <div className="space-y-6">
          <PageHeader
            title="Gerenciamento de Manutenções"
            subtitle="Acompanhe e gerencie ordens de serviço do sistema"
            icon={faWrench}
            actions={headerActions}
          />

          <ResponsiveTabs
            tabs={tabs}
            activeTab={activeTab}
            onChange={handleTabChange}
          />

          {activeTab === TAB_IDS.OCORRENCIAS ? (
            <OcorrenciasTab
              tab={tabOcorrencias}
              isAdmin={isAdmin}
              onDeleteOs={(o) => tabOcorrencias.deleteModal.openModal(o)}
            />
          ) : (
            <ManutencoesTab
              tab={tabManutencoes}
              isAdmin={isAdmin}
              onDeleteManutencao={(item) =>
                tabManutencoes.deleteModal.openModal({
                  ...item,
                  _kind: 'manutencao',
                })
              }
              onDeleteOs={(o) =>
                tabManutencoes.deleteModal.openModal({
                  ...o,
                  _kind: 'osCorretiva',
                })
              }
            />
          )}
        </div>
      </PageLayout>
    </>
  );
}

export default ManutencoesPage;
