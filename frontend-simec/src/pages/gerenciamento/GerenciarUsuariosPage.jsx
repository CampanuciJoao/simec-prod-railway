import React from 'react';

import { useGerenciarUsuariosPage } from '@/hooks/gerenciamento/useGerenciarUsuariosPage';
import { ModalConfirmacao, PageSection, PageState } from '@/components/ui';
import { UsuarioForm, UsuariosTable } from '@/components/gerenciamento';

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
        title="Confirmar exclusao"
        message={`Tem certeza que deseja excluir o usuario "${page.userToDelete?.nome}"?`}
        isDestructive
      />

      <PageSection
        title="Usuarios"
        description="Cadastre, edite e remova usuarios com seguranca."
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
          <div className="space-y-4">
            <PageState isEmpty emptyMessage="Nenhum usuario encontrado." />
            <div className="flex justify-center sm:justify-start">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
                style={{
                  backgroundColor: 'var(--brand-primary)',
                  color: 'var(--text-on-brand)',
                }}
                onClick={page.handleCreate}
              >
                Criar primeiro usuario
              </button>
            </div>
          </div>
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
