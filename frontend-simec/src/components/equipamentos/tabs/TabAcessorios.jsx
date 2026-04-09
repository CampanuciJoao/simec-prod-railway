// Ficheiro: src/components/abas-equipamento/TabAcessorios.jsx
// NOVO COMPONENTE - RESPONSÁVEL PELA ABA DE ACESSÓRIOS

import React, { useState } from 'react';
import { useAcessorios } from '../../hooks/useAcessorios';
import { useModal } from '../../hooks/useModal';
import AcessorioForm from '../AcessorioForm';
import ModalConfirmacao from '../ModalConfirmacao';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHdd, faPlus, faEdit, faTrashAlt, faSpinner } from '@fortawesome/free-solid-svg-icons';

function TabAcessorios({ equipamentoId }) {
  // --- Hooks ---
  const { 
    acessorios, 
    loading, 
    submitting, 
    error,
    salvarAcessorio, 
    removerAcessorio 
  } = useAcessorios(equipamentoId);
  
  const { isOpen, modalData, openModal, closeModal } = useModal();

  // Estado local para controlar a UI desta aba
  const [showForm, setShowForm] = useState(false);
  const [editingAcessorio, setEditingAcessorio] = useState(null);

  // --- Handlers ---
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
    const success = await salvarAcessorio(formData, editingAcessorio ? editingAcessorio.id : null);
    if (success) {
      handleCancelForm(); // Fecha e limpa o formulário em caso de sucesso
    }
  };
  
  const handleDeleteClick = (acessorio) => {
    openModal(acessorio); // Abre o modal de confirmação com os dados do acessório
  };

  const handleConfirmarExclusao = () => {
    if (modalData) {
      removerAcessorio(modalData.id);
    }
    closeModal();
  };

  return (
    <>
      {/* O Modal de confirmação agora pertence a esta aba */}
      <ModalConfirmacao
        isOpen={isOpen}
        onClose={closeModal}
        onConfirm={handleConfirmarExclusao}
        title="Confirmar Exclusão de Acessório"
        message={`Tem certeza que deseja excluir o acessório "${modalData?.nome}"?`}
        isDestructive={true}
      />

      <div>
        <div className="section-header">
          <h3 className="tab-title">
            <FontAwesomeIcon icon={faHdd} /> Acessórios Vinculados
          </h3>
          {!showForm && (
            <button className="btn btn-primary btn-sm" onClick={handleAddNewClick} disabled={submitting}>
              <FontAwesomeIcon icon={faPlus} /> Adicionar Acessório
            </button>
          )}
        </div>

        {/* Renderiza o formulário se showForm for true */}
        {showForm && (
          <div className="form-container-inline">
            <AcessorioForm
              key={editingAcessorio ? editingAcessorio.id : 'novo'}
              initialData={editingAcessorio}
              isEditing={!!editingAcessorio}
              isSubmitting={submitting}
              onSubmit={handleFormSubmit}
              onCancel={handleCancelForm}
              error={error} // Passa o erro do hook para o formulário
            />
          </div>
        )}

        {/* Renderiza o loader ou a tabela de acessórios */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <FontAwesomeIcon icon={faSpinner} spin /> Carregando acessórios...
          </div>
        ) : (
          acessorios.length > 0 ? (
            <div className="table-responsive-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Nº de Série</th>
                    <th>Descrição</th>
                    <th className="text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {acessorios.map(acessorio => (
                    <tr key={acessorio.id}>
                      <td data-label="Nome">{acessorio.nome}</td>
                      <td data-label="Nº Série">{acessorio.numeroSerie || 'N/A'}</td>
                      <td data-label="Descrição">{acessorio.descricao || 'N/A'}</td>
                      <td className="actions-cell text-right">
                        <button onClick={() => handleEditClick(acessorio)} className="btn-action edit" title="Editar" disabled={submitting}>
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                        <button onClick={() => handleDeleteClick(acessorio)} className="btn-action delete" title="Excluir" disabled={submitting}>
                          <FontAwesomeIcon icon={faTrashAlt} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            // Mensagem exibida apenas se não estiver carregando e não houver acessórios
            !showForm && <p className="no-data-message">Nenhum acessório cadastrado para este equipamento.</p>
          )
        )}
      </div>
    </>
  );
}

export default TabAcessorios;