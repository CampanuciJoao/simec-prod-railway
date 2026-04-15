import React from 'react';

import { useGerenciarUsuariosPage } from '@/hooks/gerenciamento/useGerenciarUsuariosPage';

import ModalConfirmacao from '@/components/ui/feedback/ModalConfirmacao';
import PageSection from '@/components/ui/layout/PageSection';
import PageState from '@/components/ui/feedback/PageState';

import {
  UsuarioForm,
  UsuariosTable,
} from '@/components/gerenciamento';

function GerenciarUsuariosPage() {
  const page = useGerenciarUsuariosPage();

  if (page.loading) {
    return <PageState loading />;
  }

  return (
    <>
      <ModalConfirmacao
        isOpen={page.isDeleteModalOpen}
        onClose={page.closeDeleteModal}
        onConfirm={page.handleConfirmDelete}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir o usuário "${page.userToDelete?.nome}"?`}
        isDestructive
      />

      <PageSection
        title="Usuários"
        description="Cadastre, edite e remova usuários com segurança."
      >
        {page.showForm ? (
          <UsuarioForm
            onSubmit={page.handleSave}
            onCancel={page.handleCancelForm}
            isSubmitting={page.isSubmittingForm}
            isEditing={!!page.editingUser}
            initialData={page.editingUser}
          />
        ) : page.isEmpty ? (
          <PageState isEmpty emptyMessage="Nenhum usuário encontrado." />
        ) : (
          <UsuariosTable
            usuarios={page.usuarios}
            usuarioLogadoId={page.usuarioLogadoId}
            onCreate={page.handleCreate}
            onEdit={page.handleEdit}
            onAskDelete={page.openDeleteModal}
          />
        )}
      </PageSection>
    </>
  );
}

export default GerenciarUsuariosPage;