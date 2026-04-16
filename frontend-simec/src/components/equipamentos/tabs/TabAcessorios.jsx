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
        title="Excluir acessório"
        message={`Deseja excluir "${modalData?.nome}"?`}
        isDestructive
      />

      <PageSection
        title="Acessórios"
        description="Gerencie os acessórios vinculados ao equipamento"
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <FontAwesomeIcon icon={faHdd} />
          </span>

          <div>
            <p className="text-sm font-semibold text-slate-900">
              Acessórios associados
            </p>
            <p className="text-sm text-slate-500">
              Inclua e mantenha os itens complementares do equipamento
            </p>
          </div>
        </div>

        {!showForm && (
          <div className="mb-5">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAddNewClick}
              disabled={submitting}
            >
              <FontAwesomeIcon icon={faPlus} />
              <span>Adicionar</span>
            </button>
          </div>
        )}

        {showForm && (
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <AcessorioForm
              key={editingAcessorio ? editingAcessorio.id : 'novo'}
              initialData={editingAcessorio}
              isEditing={!!editingAcessorio}
              isSubmitting={submitting}
              onSubmit={handleFormSubmit}
              onCancel={handleCancelForm}
              error={error}
            />
          </div>
        )}

        <AcessoriosList
          acessorios={acessorios}
          loading={loading}
          submitting={submitting}
          showForm={showForm}
          onEdit={handleEditClick}
          onDelete={openModal}
        />
      </PageSection>
    </>
  );
}

export default TabAcessorios;