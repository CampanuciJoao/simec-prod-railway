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
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';

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

    if (success) handleCancelForm();
  };

  const handleDeleteClick = (acessorio) => {
    openModal(acessorio);
  };

  const handleConfirmarExclusao = async () => {
    if (modalData) await removerAcessorio(modalData.id);
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

      <div className="space-y-5">
        {/* HEADER */}
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
              <FontAwesomeIcon icon={faHdd} />
            </span>

            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Acessórios vinculados
              </h3>
              <p className="text-sm text-slate-500">
                Gerencie os acessórios associados ao equipamento
              </p>
            </div>
          </div>

          {!showForm && (
            <button
              className="btn btn-primary"
              onClick={handleAddNewClick}
              disabled={submitting}
            >
              <FontAwesomeIcon icon={faPlus} />
              <span>Adicionar</span>
            </button>
          )}
        </div>

        {/* FORM */}
        {showForm && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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

        {/* LOADING */}
        {loading && (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            <FontAwesomeIcon icon={faSpinner} spin />
            Carregando acessórios...
          </div>
        )}

        {/* LISTA */}
        {!loading && acessorios.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Nº Série</th>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {acessorios.map((acessorio) => (
                  <tr key={acessorio.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {acessorio.nome}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {acessorio.numeroSerie || 'N/A'}
                    </td>

                    <td className="px-4 py-3 text-slate-600">
                      {acessorio.descricao || 'N/A'}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEditClick(acessorio)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white"
                          disabled={submitting}
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>

                        <button
                          onClick={() => handleDeleteClick(acessorio)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white"
                          disabled={submitting}
                        >
                          <FontAwesomeIcon icon={faTrashAlt} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* EMPTY */}
        {!loading && acessorios.length === 0 && !showForm && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            Nenhum acessório cadastrado.
          </div>
        )}
      </div>
    </>
  );
}

export default TabAcessorios;