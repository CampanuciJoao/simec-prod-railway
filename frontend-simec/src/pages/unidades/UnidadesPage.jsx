import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faPlus, 
    faEdit, 
    faTrashAlt, 
    faSpinner, 
    faInfoCircle, 
    faMapMarkedAlt, 
    faHashtag 
} from '@fortawesome/free-solid-svg-icons';
import { useUnidades } from '../../hooks/unidades/useUnidades';
import { useModal } from '../../hooks/shared/useModal';
import ModalConfirmacao from '../../components/ui/ModalConfirmacao';
import { useToast } from '../../contexts/ToastContext';

/**
 * Função para formatar o endereço completo da unidade.
 * @param {object} unidade - Objeto da unidade vindo do banco.
 */
const formatarEndereco = (unidade) => {
  if (!unidade || !unidade.logradouro) return 'Endereço não cadastrado';
  const parts = [
    `${unidade.logradouro}, ${unidade.numero || 'S/N'}`,
    unidade.complemento,
    unidade.bairro,
    `${unidade.cidade || ''}${unidade.estado ? ' - ' + unidade.estado : ''}`,
    unidade.cep ? 'CEP: ' + unidade.cep : '',
  ];
  return parts.filter(Boolean).join(', ');
};

function UnidadesPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { unidades, loading, searchTerm, setSearchTerm, removerUnidade } = useUnidades();
  const { isOpen, modalData, openModal, closeModal } = useModal();

  const confirmarExclusao = async () => {
    if (!modalData) return;
    try {
      await removerUnidade(modalData.id);
      addToast('Unidade excluída com sucesso!', 'success');
    } catch(err) {
      addToast(err.message || 'Erro ao excluir unidade.', 'error');
    } finally {
      closeModal();
    }
  };

  return (
    <>
      {/* Modal de Confirmação de Exclusão */}
      <ModalConfirmacao 
        isOpen={isOpen} 
        onClose={closeModal} 
        onConfirm={confirmarExclusao} 
        title="Confirmar Exclusão" 
        message={`Tem certeza que deseja excluir a unidade "${modalData?.nomeSistema}"? Todos os vínculos serão perdidos.`} 
        isDestructive={true} 
      />

      <section className="page-section" style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}>
        
        {/* Barra Superior: Busca e Botão Novo */}
        <div className="table-header-actions">
          <input 
            type="text" 
            placeholder="Buscar por nome, fantasia ou CNPJ..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
            className="search-input-table" 
          />
          <button className="btn btn-primary" onClick={() => navigate('/cadastros/unidades/adicionar')}>
            <FontAwesomeIcon icon={faPlus} /> Adicionar Unidade
          </button>
        </div>

        {/* Estado de Carregamento */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <FontAwesomeIcon icon={faSpinner} spin size="3x" color="var(--cor-primaria-light)" />
            <p style={{ marginTop: '15px', color: '#64748b', fontWeight: '500' }}>Buscando unidades...</p>
          </div>
        )}

        {/* Grid de Cards das Unidades */}
        {!loading && (
          <div className="unidades-grid">
            {unidades.length > 0 ? (
              unidades.map(unidade => (
                <div key={unidade.id} className="unidade-card">
                  
                  {/* Cabeçalho do Card */}
                  <div className="unidade-card-header">
                    <h4>{unidade.nomeSistema}</h4>
                    <div className="unidade-card-actions">
                      <button className="btn-action edit" title="Editar Unidade" onClick={() => navigate(`/cadastros/unidades/editar/${unidade.id}`)}>
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button className="btn-action delete" title="Excluir Unidade" onClick={() => openModal(unidade)}>
                        <FontAwesomeIcon icon={faTrashAlt} />
                      </button>
                    </div>
                  </div>

                  {/* Corpo do Card com Info e Ícones */}
                  <div className="unidade-card-body">
                    
                    {/* Item: Nome Fantasia */}
                    <div className="unidade-info-item">
                      <FontAwesomeIcon icon={faInfoCircle} />
                      <div className="info-content">
                        <span className="info-label">Nome Fantasia</span>
                        <span className="info-value">{unidade.nomeFantasia || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Item: CNPJ */}
                    <div className="unidade-info-item">
                      <FontAwesomeIcon icon={faHashtag} />
                      <div className="info-content">
                        <span className="info-label">CNPJ</span>
                        <span className="info-value">{unidade.cnpj || 'Não informado'}</span>
                      </div>
                    </div>

                    {/* Item: Endereço */}
                    <div className="unidade-info-item">
                      <FontAwesomeIcon icon={faMapMarkedAlt} />
                      <div className="info-content">
                        <span className="info-label">Endereço Completo</span>
                        <span className="info-value">{formatarEndereco(unidade)}</span>
                      </div>
                    </div>

                  </div>
                </div>
              ))
            ) : (
              <div className="no-data-message">
                <p>Nenhuma unidade cadastrada ou encontrada para esta busca.</p>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}

export default UnidadesPage;