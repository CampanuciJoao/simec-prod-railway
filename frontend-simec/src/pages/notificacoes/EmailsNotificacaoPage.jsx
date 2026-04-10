// Ficheiro: frontend-simec/src/pages/EmailsNotificacaoPage.jsx
// Versão: 2.0 (Sênior - CRUD Completo com Modal de Edição)
// Descrição: Página para administradores gerenciarem a lista de e-mails para notificações,
//            incluindo as subscrições para cada tipo de alerta.

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { getEmailsNotificacao, addEmailNotificacao, updateEmailNotificacao, deleteEmailNotificacao } from '../../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faPlus, faEdit, faTrashAlt, faSpinner, faCheckCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';
import Modal from '../components/Modal';
import EmailForm from '../components/EmailForm'; // Importa nosso novo formulário

function EmailsNotificacaoPage() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState(null);
  const { addToast } = useToast();

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEmailsNotificacao();
      setEmails(data || []);
    } catch (err) {
      addToast('Erro ao carregar lista de e-mails.', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const handleOpenModal = (email = null) => {
    setEditingEmail(email);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEmail(null);
  };

  const handleSave = async (formData) => {
    setIsSubmitting(true);
    try {
        if (editingEmail) { // Modo de Edição
            await updateEmailNotificacao(editingEmail.id, formData);
            addToast('Configurações de e-mail atualizadas!', 'success');
        } else { // Modo de Criação
            await addEmailNotificacao(formData);
            addToast('E-mail adicionado com sucesso!', 'success');
        }
        await fetchEmails();
        handleCloseModal();
    } catch (err) {
        addToast(err.response?.data?.message || 'Ocorreu um erro.', 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async (id, email) => {
    if (window.confirm(`Tem certeza que deseja remover o e-mail "${email}" da lista de notificações?`)) {
      try {
        await deleteEmailNotificacao(id);
        addToast('E-mail removido com sucesso!', 'success');
        fetchEmails();
      } catch (err) {
        addToast(err.response?.data?.message || 'Erro ao remover e-mail.', 'error');
      }
    }
  };

  const IconeStatus = ({ ativo }) => (
    <FontAwesomeIcon 
        icon={ativo ? faCheckCircle : faTimesCircle} 
        style={{color: ativo ? 'var(--btn-success-bg-light)' : 'var(--btn-danger-bg-light)'}}
        title={ativo ? 'Sim' : 'Não'}
    />
  );

  return (
    <>
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingEmail ? 'Editar Configurações de E-mail' : 'Adicionar Novo E-mail'} showConfirmButton={false} showCancelButton={false}>
          <EmailForm 
            initialData={editingEmail}
            onSubmit={handleSave}
            onCancel={handleCloseModal}
            isSubmitting={isSubmitting}
          />
      </Modal>

      <section className="page-section">
        <div className="table-header-actions">
            <h3><FontAwesomeIcon icon={faEnvelope} /> E-mails para Notificação de Alertas</h3>
            <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                <FontAwesomeIcon icon={faPlus} /> Adicionar E-mail
            </button>
        </div>
        <p>Gerencie a lista de e-mails que receberão alertas e configure suas subscrições e antecedência individualmente.</p>
        
        <div className="table-responsive-wrapper" style={{marginTop: '20px'}}>
          <table className="data-table">
            <thead>
              <tr>
                <th className="text-left">Nome</th>
                <th className="text-left">E-mail</th>
                <th className="text-center">Dias Antec.</th>
                <th className="text-center">Contratos</th>
                <th className="text-center">Manutenções</th>
                <th className="text-center">Seguros</th>
                <th className="text-center">Ações</th>
              </tr>
            </thead>
        <tbody>
             {loading ? (
                <tr><td colSpan="7" className="text-center"><FontAwesomeIcon icon={faSpinner} spin /> Carregando...</td></tr>
              ) : emails.length > 0 ? (
              emails.map(email => (
              <tr key={email.id}>
              {/* Adicione os data-label correspondentes a cada <th> */}
              <td data-label="Nome" className="text-left">{email.nome || '-'}</td>
              <td data-label="E-mail" className="text-left">{email.email}</td>
              <td data-label="Dias Antec." className="text-center">{email.diasAntecedencia}</td>
              <td data-label="Contratos" className="text-center"><IconeStatus ativo={email.recebeAlertasContrato} /></td>
              <td data-label="Manutenções" className="text-center"><IconeStatus ativo={email.recebeAlertasManutencao} /></td>
              <td data-label="Seguros" className="text-center"><IconeStatus ativo={email.recebeAlertasSeguro} /></td>
              <td data-label="Ações" className="actions-cell text-center">
                <button onClick={() => handleOpenModal(email)} className="btn-action edit" title="Editar Configurações"><FontAwesomeIcon icon={faEdit}/></button>
                <button onClick={() => handleDelete(email.id, email.email)} className="btn-action delete" title="Remover E-mail"><FontAwesomeIcon icon={faTrashAlt}/></button>
            </td>
        </tr>
      ))
    ) : (
     <tr><td colSpan="7" className="text-center">Nenhum e-mail cadastrado.</td></tr>
      )}
        </tbody>

          </table>
        </div>
      </section>
    </>
  );
}

export default EmailsNotificacaoPage;
