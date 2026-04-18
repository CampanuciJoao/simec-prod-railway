import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHdd,
  faPlus,
} from '@fortawesome/free-solid-svg-icons';

import { useAcessorios } from '@/hooks/equipamentos/useAcessorios';
import { useModal } from '@/hooks/shared/useModal';

import AcessorioForm from '@/components/equipamentos/AcessorioForm';
import AcessoriosList from '@/components/equipamentos/AcessoriosList';

import {
  Button,
  Card,
  ModalConfirmacao,
  PageSection,
} from '@/components/ui';

function TabAcessorios({ equipamentoId }) {
  const {
    acessorios,
    loading,
    submitting,
    error,
    salvarAcessorio,
    removerAcessorio,
  } = useAcessorios(equipamentoId);

  const { isOpen, modalData, openModal, closeModal } = useModal();

  const [showForm, setShowForm] = useState(false);
  const [editingAcessorio, setEditingAcessorio] = useState(null);

  const handleAddNewClick = () => {
    setEditingAcessorio(null);
    setShowForm(true);
  };

  const handleEditClick = (acessorio) => {
    setEditingAcessorio(acessorio);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingAcessorio(null);
  };

  const handleFormSubmit = async (formData) => {
    const success = await salvarAcessorio(
      formData,
      editingAcessorio ? editingAcessorio.id : null
    );

    if (success) {
      handleCancelForm();
    }
  };

  const handleConfirmarExclusao = async () => {
    if (modalData) {
      await removerAcessorio(modalData.id);
    }

    closeModal();
  };

  return (
    <>
      <ModalConfirmacao
        isOpen={isOpen}
        onClose={closeModal}
        onConfirm={handleConfirmarExclusao}
        title="Excluir acessorio"
        message={`Deseja excluir "${modalData?.nome}"?`}
        isDestructive
      />

      <PageSection
        title="Acessorios"
        description="Gerencie os acessorios vinculados ao equipamento."
        headerRight={
          !showForm ? (
            <Button
              type="button"
              size="sm"
              onClick={handleAddNewClick}
              disabled={submitting}
            >
              <FontAwesomeIcon icon={faPlus} />
              <span>Cadastrar acessorio</span>
            </Button>
          ) : null
        }
      >
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <span
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
              style={{
                backgroundColor: 'var(--brand-primary-soft)',
                color: 'var(--brand-primary)',
              }}
            >
              <FontAwesomeIcon icon={faHdd} />
            </span>

            <div className="min-w-0">
              <p
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Acessorios associados
              </p>
              <p
                className="text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                Inclua e mantenha os itens complementares do equipamento.
              </p>
            </div>
          </div>

          {showForm ? (
            <Card
              surface="soft"
              className="rounded-2xl"
            >
              <AcessorioForm
                key={editingAcessorio ? editingAcessorio.id : 'novo'}
                initialData={editingAcessorio}
                isEditing={!!editingAcessorio}
                isSubmitting={submitting}
                onSubmit={handleFormSubmit}
                onCancel={handleCancelForm}
                error={error}
              />
            </Card>
          ) : null}

          <AcessoriosList
            acessorios={acessorios}
            loading={loading}
            submitting={submitting}
            showForm={showForm}
            onEdit={handleEditClick}
            onDelete={openModal}
          />
        </div>
      </PageSection>
    </>
  );
}

export default TabAcessorios;
