import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faShieldAlt,
  faPaperclip,
  faUpload,
  faTrashAlt,
  faFilePdf,
} from '@fortawesome/free-solid-svg-icons';

import { useToast } from '../../contexts/ToastContext';
import SeguroForm from '../../components/seguros/SeguroForm';
import {
  getSeguroById,
  addSeguro,
  updateSeguro,
  getEquipamentos,
  getUnidades,
  uploadAnexoSeguro,
  deleteAnexoSeguro,
} from '../../services/api';

import PageLayout from '../../components/ui/layout/PageLayout';
import PageHeader from '../../components/ui/layout/PageHeader';
import PageSection from '../../components/ui/layout/PageSection';
import PageState from '../../components/ui/feedback/PageState';
import Button from '../../components/ui/primitives/Button';

function getAnexoNome(anexo) {
  return (
    anexo?.nome ||
    anexo?.nomeArquivo ||
    anexo?.filename ||
    anexo?.fileName ||
    anexo?.nomeOriginal ||
    `Anexo #${anexo?.id ?? ''}`
  );
}

function getAnexoUrl(anexo) {
  return (
    anexo?.url ||
    anexo?.arquivoUrl ||
    anexo?.downloadUrl ||
    anexo?.caminhoArquivo ||
    anexo?.path ||
    null
  );
}

function SalvarSeguroPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const isEditing = Boolean(id);

  const [initialData, setInitialData] = useState(null);
  const [equipamentosDisponiveis, setEquipamentosDisponiveis] = useState([]);
  const [unidadesDisponiveis, setUnidadesDisponiveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [anexos, setAnexos] = useState([]);
  const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
  const [uploadingAnexo, setUploadingAnexo] = useState(false);
  const [deletingAnexoId, setDeletingAnexoId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [equipamentosData, unidadesData] = await Promise.all([
        getEquipamentos(),
        getUnidades(),
      ]);

      setEquipamentosDisponiveis(
        Array.isArray(equipamentosData) ? equipamentosData : []
      );
      setUnidadesDisponiveis(Array.isArray(unidadesData) ? unidadesData : []);

      if (isEditing) {
        const seguroData = await getSeguroById(id);
        setInitialData(seguroData || null);
        setAnexos(Array.isArray(seguroData?.anexos) ? seguroData.anexos : []);
      } else {
        setInitialData(null);
        setAnexos([]);
      }
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || 'Erro ao carregar dados.';

      setError(message);
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [id, isEditing, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (formData) => {
    try {
      if (isEditing) {
        await updateSeguro(id, formData);
        addToast('Seguro atualizado com sucesso!', 'success');
        await fetchData();
      } else {
        await addSeguro(formData);
        addToast(
          'Seguro cadastrado com sucesso! Depois você poderá anexar a apólice.',
          'success'
        );
        navigate('/seguros');
        return;
      }

      navigate('/seguros');
    } catch (err) {
      throw err;
    }
  };

  const handleUploadAnexo = async () => {
    if (!id) {
      addToast(
        'Salve o seguro primeiro antes de anexar um PDF ou documento.',
        'error'
      );
      return;
    }

    if (!arquivoSelecionado) {
      addToast('Selecione um arquivo antes de enviar.', 'error');
      return;
    }

    try {
      setUploadingAnexo(true);

      const formData = new FormData();
      formData.append('file', arquivoSelecionado);

      await uploadAnexoSeguro(id, formData);
      addToast('Anexo enviado com sucesso!', 'success');
      setArquivoSelecionado(null);

      const input = document.getElementById('seguro-anexo-input');
      if (input) {
        input.value = '';
      }

      await fetchData();
    } catch (err) {
      addToast(
        err?.response?.data?.message ||
          err?.message ||
          'Erro ao enviar anexo.',
        'error'
      );
    } finally {
      setUploadingAnexo(false);
    }
  };

  const handleDeleteAnexo = async (anexoId) => {
    try {
      setDeletingAnexoId(anexoId);
      await deleteAnexoSeguro(id, anexoId);
      addToast('Anexo removido com sucesso!', 'success');
      await fetchData();
    } catch (err) {
      addToast(
        err?.response?.data?.message ||
          err?.message ||
          'Erro ao remover anexo.',
        'error'
      );
    } finally {
      setDeletingAnexoId(null);
    }
  };

  if (loading) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title={isEditing ? 'Editar Seguro' : 'Novo Seguro'}
          subtitle="Cadastro e gestão de apólices"
          icon={faShieldAlt}
        />
        <PageState loading />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout background="slate" padded fullHeight>
        <PageHeader
          title="Erro"
          subtitle="Não foi possível carregar o formulário"
          icon={faShieldAlt}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => navigate('/cadastros')}>
                <FontAwesomeIcon icon={faArrowLeft} />
                Cadastros
              </Button>

              <Button variant="secondary" onClick={() => navigate('/seguros')}>
                <FontAwesomeIcon icon={faArrowLeft} />
                Seguros
              </Button>
            </div>
          }
        />
        <PageState error={error} />
      </PageLayout>
    );
  }

  return (
    <PageLayout background="slate" padded fullHeight>
      <div className="space-y-6">
        <PageHeader
          title={isEditing ? 'Editar Seguro' : 'Novo Seguro'}
          subtitle="Cadastro e gestão de apólices"
          icon={faShieldAlt}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => navigate('/cadastros')}>
                <FontAwesomeIcon icon={faArrowLeft} />
                Cadastros
              </Button>

              <Button variant="secondary" onClick={() => navigate('/seguros')}>
                <FontAwesomeIcon icon={faArrowLeft} />
                Seguros
              </Button>
            </div>
          }
        />

        <SeguroForm
          onSubmit={handleSave}
          initialData={initialData}
          isEditing={isEditing}
          equipamentosDisponiveis={equipamentosDisponiveis}
          unidadesDisponiveis={unidadesDisponiveis}
          onCancel={() => navigate('/seguros')}
        />

        {isEditing ? (
          <PageSection
            title="Anexos da apólice"
            description="Envie e gerencie documentos vinculados ao seguro."
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center">
                <input
                  id="seguro-anexo-input"
                  type="file"
                  onChange={(e) => setArquivoSelecionado(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                />

                <Button
                  type="button"
                  onClick={handleUploadAnexo}
                  disabled={!arquivoSelecionado || uploadingAnexo}
                >
                  <FontAwesomeIcon icon={faUpload} />
                  {uploadingAnexo ? 'Enviando...' : 'Enviar anexo'}
                </Button>
              </div>

              {anexos.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {anexos.map((anexo) => {
                    const url = getAnexoUrl(anexo);

                    return (
                      <div
                        key={anexo.id}
                        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-slate-800">
                            <FontAwesomeIcon
                              icon={faPaperclip}
                              className="text-slate-500"
                            />
                            <span className="truncate font-medium">
                              {getAnexoNome(anexo)}
                            </span>
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {anexo.tipoMime || 'Documento'}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                            >
                              <FontAwesomeIcon icon={faFilePdf} />
                              Abrir
                            </a>
                          ) : null}

                          <Button
                            type="button"
                            variant="danger"
                            disabled={deletingAnexoId === anexo.id}
                            onClick={() => handleDeleteAnexo(anexo.id)}
                          >
                            <FontAwesomeIcon icon={faTrashAlt} />
                            {deletingAnexoId === anexo.id ? 'Removendo...' : 'Excluir'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <PageState
                  isEmpty
                  emptyMessage="Nenhum anexo enviado para este seguro."
                />
              )}
            </div>
          </PageSection>
        ) : null}
      </div>
    </PageLayout>
  );
}

export default SalvarSeguroPage;