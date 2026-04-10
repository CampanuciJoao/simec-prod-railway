// Ficheiro: src/pages/AcessoriosEquipamentoPage.jsx
// VERSÃO FINAL SÊNIOR - COMPONENTE DE PÁGINA "INTELIGENTE" E ORQUESTRADOR

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEquipamentoById } from '../../services/api';
import { useAcessorios } from '../hooks/useAcessorios';
import AcessorioForm from '../components/AcessorioForm';
import { faSpinner, faPlus, faEdit, faTrashAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

function AcessoriosEquipamentoPage() {
  const { equipamentoId } = useParams();
  const navigate = useNavigate();

  // --- Hooks ---
  // Delega toda a gestão de acessórios para o hook customizado.
  const { 
    acessorios, 
    loading: loadingAcessorios, 
    submitting, 
    error: errorAcessorios, 
    salvarAcessorio, 
    removerAcessorio 
  } = useAcessorios(equipamentoId);

  // Estado que pertence exclusivamente a esta página.
  const [equipamento, setEquipamento] = useState(null);
  const [loadingEquipamento, setLoadingEquipamento] = useState(true);
  const [errorEquipamento, setErrorEquipamento] = useState(null);
  const [editingAcessorio, setEditingAcessorio] = useState(null); // Controla o modo de edição.

  // --- Efeitos ---
  // Efeito para carregar os dados do equipamento pai.
  useEffect(() => {
    const carregarEquipamento = async () => {
      if (!equipamentoId) return;
      setLoadingEquipamento(true);
      setErrorEquipamento(null);
      try {
        const data = await getEquipamentoById(equipamentoId);
        setEquipamento(data);
      } catch (err) {
        const errorMessage = err.response?.data?.message || 'Erro ao carregar dados do equipamento.';
        setErrorEquipamento(errorMessage);
      } finally {
        setLoadingEquipamento(false);
      }
    };
    carregarEquipamento();
  }, [equipamentoId]);

  // --- Handlers (Funções de Manipulação) ---

  const handleSave = async (formData) => {
    const success = await salvarAcessorio(formData, editingAcessorio ? editingAcessorio.id : null);
    if (success) {
      setEditingAcessorcio(null); // Limpa o formulário e sai do modo de edição.
    }
  };

  const handleDelete = (acessorio) => {
    if (window.confirm(`Tem certeza que deseja excluir o acessório "${acessorio.nome}"?`)) {
      removerAcessorio(acessorio.id);
    }
  };

  const handleStartEdit = (acessorio) => {
    setEditingAcessorio(acessorio);
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola para o topo para focar no formulário.
  };

  const handleCancelEdit = () => {
    setEditingAcessorio(null);
  };

  // --- Renderização ---

  if (loadingEquipamento) {
    return (
      <div className="page-content-wrapper centered-loader">
        <FontAwesomeIcon icon={faSpinner} spin size="3x" color="#3b82f6" />
      </div>
    );
  }

  if (errorEquipamento) {
    return (
      <div className="page-content-wrapper">
        <div className="page-title-card">
          <h1 className="page-title-internal">Erro</h1>
        </div>
        <p className="form-error">{errorEquipamento}</p>
        <button onClick={() => navigate(-1)} className="btn">Voltar</button>
      </div>
    );
  }
  
  return (
    <div className="page-content-wrapper">
      <div className="page-title-card">
        <h1 className="page-title-internal">
          Acessórios de: {equipamento.modelo} (Tag: {equipamento.tag})
        </h1>
      </div>

      <div className="page-layout-split">
        {/* Coluna da Esquerda: Formulário */}
        <div className="layout-split-form-column">
          <section className="page-section">
            <h2 className="section-title">
              <FontAwesomeIcon icon={editingAcessorio ? faEdit : faPlus} />
              {editingAcessorio ? ' Editar Acessório' : ' Adicionar Novo Acessório'}
            </h2>
            <AcessorioForm 
              // A `key` força o React a recriar o componente quando o modo de edição muda,
              // garantindo que o estado interno do formulário seja resetado.
              key={editingAcessorio ? editingAcessorio.id : 'new'}
              onSubmit={handleSave}
              onCancel={handleCancelEdit}
              initialData={editingAcessorio}
              isEditing={!!editingAcessorio}
              isSubmitting={submitting}
              error={errorAcessorios}
            />
          </section>
        </div>

        {/* Coluna da Direita: Tabela */}
        <div className="layout-split-table-column">
          <section className="page-section">
            <h2 className="section-title">Acessórios Cadastrados ({acessorios.length})</h2>
            {loadingAcessorios && <p>Carregando acessórios...</p>}
            {!loadingAcessorios && (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Nº Série</th>
                      <th>Descrição</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {acessorios.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center' }}>
                          Nenhum acessório cadastrado.
                        </td>
                      </tr>
                    ) : (
                      acessorios.map(acc => (
                        <tr key={acc.id}>
                          <td data-label="Nome">{acc.nome}</td>
                          <td data-label="Nº Série">{acc.numeroSerie || '-'}</td>
                          <td data-label="Descrição">{acc.descricao || '-'}</td>
                          <td data-label="Ações" className="table-actions">
                            <button 
                              className="btn-action edit" 
                              title="Editar Acessório"
                              onClick={() => handleStartEdit(acc)}
                              disabled={submitting}
                            >
                              <FontAwesomeIcon icon={faEdit} />
                            </button>
                            <button 
                              className="btn-action delete" 
                              title="Excluir Acessório"
                              onClick={() => handleDelete(acc)}
                              disabled={submitting}
                            >
                              <FontAwesomeIcon icon={faTrashAlt} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default AcessoriosEquipamentoPage;