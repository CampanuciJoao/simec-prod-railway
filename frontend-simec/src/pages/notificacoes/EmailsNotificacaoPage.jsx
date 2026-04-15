import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEnvelope,
  faPlus,
  faEdit,
  faTrashAlt,
  faCheckCircle,
  faTimesCircle,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';

import { useToast } from '@/contexts/ToastContext';
import {
  getEmailsNotificacao,
  addEmailNotificacao,
  updateEmailNotificacao,
  deleteEmailNotificacao,
} from '@/services/api';

import PageLayout from '@/components/ui/layout/PageLayout';
import PageHeader from '@/components/ui/layout/PageHeader';
import PageSection from '@/components/ui/layout/PageSection';
import PageState from '@/components/ui/feedback/PageState';
import Button from '@/components/ui/primitives/Button';
import Card from '@/components/ui/primitives/Card';
import EmailForm from '@/components/emails/EmailForm';

function FormModal({ open, title, onClose, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            aria-label="Fechar modal"
            title="Fechar"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

FormModal.propTypes = {
  open: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

function StatusIcon({ ativo }) {
  return (
    <span
      className={[
        'inline-flex items-center justify-center rounded-full text-base',
        ativo ? 'text-emerald-600' : 'text-red-500',
      ].join(' ')}
      title={ativo ? 'Sim' : 'Não'}
    >
      <FontAwesomeIcon icon={ativo ? faCheckCircle : faTimesCircle} />
    </span>
  );
}

StatusIcon.propTypes = {
  ativo: PropTypes.bool,
};

StatusIcon.defaultProps = {
  ativo: false,
};

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
      setEmails(Array.isArray(data) ? data : []);
    } catch (err) {
      setEmails([]);
      addToast(
        err?.response?.data?.message || 'Erro ao carregar lista de e-mails.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const handleOpenModal = useCallback((email = null) => {
    setEditingEmail(email);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    if (isSubmitting) return;

    setIsModalOpen(false);
    setEditingEmail(null);
  }, [isSubmitting]);

  const handleSave = useCallback(
    async (formData) => {
      setIsSubmitting(true);

      try {
        if (editingEmail?.id) {
          await updateEmailNotificacao(editingEmail.id, formData);
          addToast('Configurações de e-mail atualizadas!', 'success');
        } else {
          await addEmailNotificacao(formData);
          addToast('E-mail adicionado com sucesso!', 'success');
        }

        await fetchEmails();
        handleCloseModal();
      } catch (err) {
        addToast(
          err?.response?.data?.message ||
            'Ocorreu um erro ao salvar o e-mail.',
          'error'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [editingEmail, addToast, fetchEmails, handleCloseModal]
  );

  const handleDelete = useCallback(
    async (id, email) => {
      const confirmed = window.confirm(
        `Tem certeza que deseja remover o e-mail "${email}" da lista de notificações?`
      );

      if (!confirmed) return;

      try {
        await deleteEmailNotificacao(id);
        addToast('E-mail removido com sucesso!', 'success');
        await fetchEmails();
      } catch (err) {
        addToast(
          err?.response?.data?.message || 'Erro ao remover e-mail.',
          'error'
        );
      }
    },
    [addToast, fetchEmails]
  );

  const isEmpty = !loading && emails.length === 0;

  const headerTitle = useMemo(
    () =>
      editingEmail
        ? 'Editar Configurações de E-mail'
        : 'Adicionar Novo E-mail',
    [editingEmail]
  );

  return (
    <PageLayout background="slate" padded fullHeight>
      <div className="space-y-6">
        <FormModal
          open={isModalOpen}
          onClose={handleCloseModal}
          title={headerTitle}
        >
          <EmailForm
            initialData={editingEmail}
            onSubmit={handleSave}
            onCancel={handleCloseModal}
            isSubmitting={isSubmitting}
          />
        </FormModal>

        <PageHeader
          title="E-mails de Notificação"
          subtitle="Gerencie os destinatários de alertas e suas preferências de envio"
          icon={faEnvelope}
          actions={
            <Button type="button" onClick={() => handleOpenModal()}>
              <FontAwesomeIcon icon={faPlus} />
              Adicionar E-mail
            </Button>
          }
        />

        <PageSection
          title="Lista de destinatários"
          description="Configure antecedência e subscrições de contratos, manutenções e seguros."
        >
          {loading ? (
            <PageState loading />
          ) : isEmpty ? (
            <PageState isEmpty emptyMessage="Nenhum e-mail cadastrado." />
          ) : (
            <Card padded={false} className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3">Nome</th>
                      <th className="px-4 py-3">E-mail</th>
                      <th className="px-4 py-3 text-center">Dias Antec.</th>
                      <th className="px-4 py-3 text-center">Contratos</th>
                      <th className="px-4 py-3 text-center">Manutenções</th>
                      <th className="px-4 py-3 text-center">Seguros</th>
                      <th className="px-4 py-3 text-center">Ações</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {emails.map((email) => (
                      <tr key={email.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-800">
                          {email.nome || '-'}
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-800">
                          {email.email}
                        </td>

                        <td className="px-4 py-3 text-center text-sm text-slate-700">
                          {email.diasAntecedencia}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <StatusIcon ativo={email.recebeAlertasContrato} />
                        </td>

                        <td className="px-4 py-3 text-center">
                          <StatusIcon ativo={email.recebeAlertasManutencao} />
                        </td>

                        <td className="px-4 py-3 text-center">
                          <StatusIcon ativo={email.recebeAlertasSeguro} />
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => handleOpenModal(email)}
                              title="Editar configurações"
                            >
                              <FontAwesomeIcon icon={faEdit} />
                            </Button>

                            <Button
                              type="button"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(email.id, email.email)}
                              title="Remover e-mail"
                            >
                              <FontAwesomeIcon icon={faTrashAlt} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </PageSection>
      </div>
    </PageLayout>
  );
}

export default EmailsNotificacaoPage;