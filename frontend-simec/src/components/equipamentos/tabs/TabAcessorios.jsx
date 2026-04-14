import React, { useState } from 'react';
import { useAcessorios } from '../../../hooks/equipamentos/useAcessorios';
import { useModal } from '../../../hooks/shared/useModal';
import AcessorioForm from '../AcessorioForm';
import ModalConfirmacao from '../../ui/ModalConfirmacao';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHdd,
  faPlus,
  faEdit,
  faTrashAlt,
} from '@fortawesome/free-solid-svg-icons';

import PageSection from '../../ui/PageSection';
import { ActionBar, EmptyState, LoadingState } from '../../ui/layout';

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

        <ActionBar
          className="mb-5"
          right={
            !showForm ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAddNewClick}
                disabled={submitting}
              >
                <FontAwesomeIcon icon={faPlus} />
                <span>Adicionar</span>
              </button>
            ) : null
          }
        />

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

        {loading ? (
          <LoadingState message="Carregando acessórios..." />
        ) : acessorios.length === 0 && !showForm ? (
          <EmptyState message="Nenhum acessório cadastrado." />
        ) : (
          <div className="flex flex-col gap-3">
            {acessorios.map((acessorio) => (
              <div
                key={acessorio.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-slate-800">
                      {acessorio.nome}
                    </div>

                    <div className="text-xs text-slate-500">
                      Nº Série: {acessorio.numeroSerie || 'N/A'}
                    </div>

                    <div className="text-xs text-slate-500">
                      {acessorio.descricao || 'Sem descrição'}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditClick(acessorio)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition hover:bg-blue-600 hover:text-white"
                      disabled={submitting}
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </button>

                    <button
                      type="button"
                      onClick={() => openModal(acessorio)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-600 hover:text-white"
                      disabled={submitting}
                    >
                      <FontAwesomeIcon icon={faTrashAlt} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageSection>
    </>
  );
}

export default TabAcessorios;