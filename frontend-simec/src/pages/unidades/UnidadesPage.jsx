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
  faHashtag,
} from '@fortawesome/free-solid-svg-icons';

import { useUnidades } from '../../hooks/unidades/useUnidades';
import { useModal } from '../../hooks/shared/useModal';
import { useToast } from '../../contexts/ToastContext';

import ModalConfirmacao from '../../components/ui/ModalConfirmacao';
import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import PageSection from '../../components/ui/PageSection';
import PageState from '../../components/ui/PageState';

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

  const { unidades, loading, searchTerm, setSearchTerm, removerUnidade } =
    useUnidades();

  const { isOpen, modalData, openModal, closeModal } = useModal();

  const confirmarExclusao = async () => {
    if (!modalData) return;

    try {
      await removerUnidade(modalData.id);
      addToast('Unidade excluída com sucesso!', 'success');
    } catch (err) {
      addToast(err.message || 'Erro ao excluir unidade.', 'error');
    } finally {
      closeModal();
    }
  };

  return (
    <PageLayout background="slate" padded fullHeight>
      <ModalConfirmacao
        isOpen={isOpen}
        onClose={closeModal}
        onConfirm={confirmarExclusao}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir a unidade "${modalData?.nomeSistema}"?`}
        isDestructive
      />

      <PageHeader
        title="Unidades"
        actions={
          <button
            className="btn btn-primary"
            onClick={() => navigate('/cadastros/unidades/adicionar')}
          >
            <FontAwesomeIcon icon={faPlus} />
            Nova Unidade
          </button>
        }
      />

      <PageSection>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
          <input
            type="text"
            placeholder="Buscar por nome, fantasia ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input md:max-w-sm"
          />
        </div>

        {loading ? (
          <PageState loading />
        ) : unidades.length === 0 ? (
          <PageState
            isEmpty
            emptyMessage="Nenhuma unidade encontrada."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {unidades.map((unidade) => (
              <div
                key={unidade.id}
                className="card-base card-padding flex flex-col gap-4"
              >
                {/* HEADER */}
                <div className="flex items-start justify-between">
                  <h4 className="font-semibold text-slate-900">
                    {unidade.nomeSistema}
                  </h4>

                  <div className="flex gap-2">
                    <button
                      className="btn btn-ghost"
                      onClick={() =>
                        navigate(`/cadastros/unidades/editar/${unidade.id}`)
                      }
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </button>

                    <button
                      className="btn btn-ghost text-red-600 hover:text-red-700"
                      onClick={() => openModal(unidade)}
                    >
                      <FontAwesomeIcon icon={faTrashAlt} />
                    </button>
                  </div>
                </div>

                {/* INFO */}
                <div className="flex flex-col gap-3 text-sm text-slate-600">
                  <div className="flex items-start gap-2">
                    <FontAwesomeIcon icon={faInfoCircle} />
                    <span>{unidade.nomeFantasia || 'N/A'}</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <FontAwesomeIcon icon={faHashtag} />
                    <span>{unidade.cnpj || 'Não informado'}</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <FontAwesomeIcon icon={faMapMarkedAlt} />
                    <span>{formatarEndereco(unidade)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageSection>
    </PageLayout>
  );
}

export default UnidadesPage;