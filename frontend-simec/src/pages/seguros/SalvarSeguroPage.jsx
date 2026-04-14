import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faShieldAlt,
  faPaperclip,
  faUpload,
  faTrashAlt,
  faFilePdf,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';

import PageLayout from '../../components/ui/PageLayout';
import PageHeader from '../../components/ui/PageHeader';
import PageState from '../../components/ui/feedback/PageState';
import PageSection from '../../components/ui/PageSection';

function getAnexoNome(anexo) {
  return (
    anexo?.nome ||
    anexo?.nomeArquivo ||
    anexo?.filename ||
    anexo?.fileName ||
    `Anexo #${anexo?.id ?? ''}`
  );
}

function getAnexoUrl(anexo) {
  return (
    anexo?.url ||
    anexo?.arquivoUrl ||
    anexo?.downloadUrl ||
    anexo?.caminhoArquivo ||
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
      setError(
        err?.response?.data?.message || err?.message || 'Erro ao carregar dados.'
      );
      addToast('Falha ao carregar dados.', 'error');
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
          'Seguro cadastrado com sucesso! Agora você já pode editar e anexar o PDF da apólice.',
          'success'
        );
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
      formData.append('file', file);

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
      <PageLayout background="slate" padded fullHeight contentClassName="page-stack">
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
      <PageLayout background="slate" padded fullHeight contentClassName="page-stack">
        <PageHeader
          title="Erro"
          subtitle="Não foi possível carregar o formulário"
          icon={faShieldAlt}
          actions={
            <div className="flex flex-wrap gap-2">
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/cadastros')}
              >
                <FontAwesomeIcon icon={faArrowLeft} />
                Cadastros
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => navigate('/seguros')}
              >
                <FontAwesomeIcon icon={faArrowLeft} />
                Seguros
              </button>
            </div>
          }
        />
        <PageState error={error} />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      background="slate"
      padded
      fullHeight
      contentClassName="page-stack content-fade-in"
    >
      <PageHeader
        title={isEditing ? 'Editar Seguro' : 'Novo Seguro'}
        subtitle="Cadastro e gestão de apólices"
        icon={faShieldAlt}
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/cadastros')}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              Cadastros
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => navigate('/seguros')}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              Seguros
            </button>
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

      <PageSection
        title="Anexos da apólice"
        description="Envie PDF da apólice e outros documentos relacionados ao seguro."
      >
        {!isEditing ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Primeiro salve o seguro. Depois disso, você poderá editar o registro e anexar o PDF da apólice.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                <div className="flex-1">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Selecionar arquivo
                  </label>

                  <input
                    id="seguro-anexo-input"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={(e) => setArquivoSelecionado(e.target.files?.[0] || null)}
                    className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleUploadAnexo}
                  disabled={uploadingAnexo}
                >
                  <FontAwesomeIcon
                    icon={uploadingAnexo ? faSpinner : faUpload}
                    spin={uploadingAnexo}
                  />
                  {uploadingAnexo ? 'Enviando...' : 'Enviar anexo'}
                </button>
              </div>

              {arquivoSelecionado ? (
                <p className="mt-3 text-sm text-slate-500">
                  Arquivo selecionado: <strong>{arquivoSelecionado.name}</strong>
                </p>
              ) : null}
            </div>

            <div className="space-y-3">
              {anexos.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">
                  Nenhum anexo enviado para esta apólice.
                </div>
              ) : (
                anexos.map((anexo) => {
                  const anexoUrl = getAnexoUrl(anexo);

                  return (
                    <div
                      key={anexo.id}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                          <FontAwesomeIcon icon={faFilePdf} />
                        </span>

                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {getAnexoNome(anexo)}
                          </p>
                          <p className="text-xs text-slate-500">
                            ID do anexo: {anexo.id}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {anexoUrl ? (
                          <a
                            href={anexoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary"
                          >
                            <FontAwesomeIcon icon={faPaperclip} />
                            Abrir
                          </a>
                        ) : null}

                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => handleDeleteAnexo(anexo.id)}
                          disabled={deletingAnexoId === anexo.id}
                        >
                          <FontAwesomeIcon
                            icon={deletingAnexoId === anexo.id ? faSpinner : faTrashAlt}
                            spin={deletingAnexoId === anexo.id}
                          />
                          {deletingAnexoId === anexo.id ? 'Removendo...' : 'Excluir'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </PageSection>
    </PageLayout>
  );
}

export default SalvarSeguroPage;