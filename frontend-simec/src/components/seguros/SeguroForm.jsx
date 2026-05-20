import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperclip, faXmark } from '@fortawesome/free-solid-svg-icons';

import { useSeguroForm } from '@/hooks/seguros/useSeguroForm';
import { useApoliceExtractor } from '@/hooks/seguros/useApoliceExtractor';

import {
  FileDropZone,
  FormActions,
  FormSection,
  PageState,
} from '@/components/ui';

import ExtracaoApoliceCard from './ExtracaoApoliceCard';
import SeguroBasicosFields from './SeguroBasicosFields';
import SeguroCoberturaFields from './SeguroCoberturaFields';

function PendingFileItem({ file, onRemove }) {
  return (
    <div
      className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm"
      style={{
        borderColor: 'var(--border-soft)',
        backgroundColor: 'var(--bg-surface-soft)',
        color: 'var(--text-secondary)',
      }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <FontAwesomeIcon icon={faPaperclip} style={{ color: 'var(--text-muted)' }} />
        <span className="truncate">{file.name}</span>
        <span className="shrink-0 text-xs" style={{ color: 'var(--text-muted)' }}>
          ({(file.size / 1024).toFixed(0)} KB)
        </span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="ml-3 shrink-0 rounded p-1 transition"
        style={{ color: 'var(--color-danger)' }}
      >
        <FontAwesomeIcon icon={faXmark} />
      </button>
    </div>
  );
}

function SeguroForm({
  onSubmit,
  initialData,
  isEditing,
  equipamentosDisponiveis = [],
  unidadesDisponiveis = [],
  onCancel,
  anexos = [],
  onDelete,
}) {
  const {
    formData,
    setFormData,
    error,
    isSubmitting,
    setIsSubmitting,
    setError,
    coberturaFields,
    equipamentosFiltrados,
    handleChange: handleChangeBase,
    buildPayload,
  } = useSeguroForm({ initialData, isEditing, equipamentosDisponiveis });

  const [pendingFiles, setPendingFiles] = useState([]);

  const {
    extraindo,
    erro: erroExtracao,
    requerSenha,
    senhaInvalida,
    extrair,
    extrairComSenha,
    cancelar: cancelarSenha,
  } = useApoliceExtractor();

  const [camposExtraidos, setCamposExtraidos] = useState(() => new Set());
  const [avisosExtracao, setAvisosExtracao] = useState([]);

  const aplicarExtracao = useCallback(
    (data, arquivo) => {
      const camposPreenchidos = new Set();
      const merged = { ...formData };

      Object.entries(data.campos || {}).forEach(([key, value]) => {
        const valido =
          value !== null &&
          value !== undefined &&
          value !== '' &&
          !(typeof value === 'number' && value === 0 && key !== 'premioTotal');

        if (valido) {
          merged[key] = value;
          camposPreenchidos.add(key);
        }
      });

      setFormData(merged);
      setCamposExtraidos(camposPreenchidos);
      setAvisosExtracao(data.avisos || []);

      if (arquivo) {
        setPendingFiles((prev) => {
          const jaExiste = prev.some(
            (f) => f.name === arquivo.name && f.size === arquivo.size
          );
          return jaExiste ? prev : [...prev, arquivo];
        });
      }
    },
    [formData, setFormData]
  );

  const handleDropPdf = useCallback(
    async (files) => {
      const arquivo = files?.[0];
      if (!arquivo) return;

      const resultado = await extrair(arquivo);

      if (resultado.sucesso) {
        aplicarExtracao(resultado.data, arquivo);
      }
    },
    [extrair, aplicarExtracao]
  );

  const handleEnviarSenha = useCallback(
    async (senha) => {
      const resultado = await extrairComSenha(senha);
      if (resultado.sucesso) {
        aplicarExtracao(resultado.data, null);
      }
    },
    [extrairComSenha, aplicarExtracao]
  );

  const handleChange = useCallback(
    (e) => {
      handleChangeBase(e);
      const nome = e.target.name;
      if (camposExtraidos.has(nome)) {
        setCamposExtraidos((prev) => {
          const next = new Set(prev);
          next.delete(nome);
          return next;
        });
      }
    },
    [handleChangeBase, camposExtraidos]
  );

  const addFiles = useCallback((files) => {
    if (files.length) setPendingFiles((prev) => [...prev, ...files]);
  }, []);

  const handleFileRemove = (index) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setIsSubmitting(true);
      const payload = buildPayload();
      await onSubmit(payload, pendingFiles);
    } catch {
      setError('Erro ao salvar seguro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? <PageState error={error} /> : null}

      {!isEditing ? (
        <ExtracaoApoliceCard
          extraindo={extraindo}
          requerSenha={requerSenha}
          senhaInvalida={senhaInvalida}
          erro={erroExtracao}
          avisos={avisosExtracao}
          onDropPdf={handleDropPdf}
          onEnviarSenha={handleEnviarSenha}
          onCancelarSenha={cancelarSenha}
        />
      ) : null}

      <SeguroBasicosFields
        formData={formData}
        onChange={handleChange}
        camposExtraidos={camposExtraidos}
        unidadesDisponiveis={unidadesDisponiveis}
        equipamentosFiltrados={equipamentosFiltrados}
      />

      <SeguroCoberturaFields
        formData={formData}
        onChange={handleChange}
        camposExtraidos={camposExtraidos}
        coberturaFields={coberturaFields}
      />

      <FormSection
        title="Documentos"
        description="Anexe a apólice e comprovantes."
      >
        <div className="space-y-3">
          {isEditing && anexos.length > 0 ? (
            <div className="flex flex-col gap-2">
              {anexos.map((anexo) => (
                <div
                  key={anexo.id}
                  className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm"
                  style={{
                    borderColor: 'var(--border-soft)',
                    backgroundColor: 'var(--bg-surface-soft)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <a
                    href={anexo.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-w-0 items-center gap-2 truncate hover:underline"
                    style={{ color: 'var(--brand-primary)' }}
                  >
                    <FontAwesomeIcon icon={faPaperclip} />
                    <span className="truncate">{anexo.nomeOriginal || anexo.name || 'Arquivo'}</span>
                  </a>
                  {onDelete ? (
                    <button
                      type="button"
                      onClick={() => onDelete(anexo.id)}
                      className="ml-3 shrink-0 rounded p-1 transition"
                      style={{ color: 'var(--color-danger)' }}
                    >
                      <FontAwesomeIcon icon={faXmark} />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {pendingFiles.length > 0 ? (
            <div className="flex flex-col gap-2">
              {pendingFiles.map((file, index) => (
                <PendingFileItem
                  key={index}
                  file={file}
                  onRemove={() => handleFileRemove(index)}
                />
              ))}
            </div>
          ) : null}

          <FileDropZone
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            label="Arraste um arquivo aqui ou"
            ctaLabel="clique para selecionar"
            hint="PDF, JPG, PNG, DOC, DOCX"
            onFiles={addFiles}
          />
        </div>
      </FormSection>

      <FormActions
        onCancel={onCancel}
        loading={isSubmitting}
        submitLabel={isEditing ? 'Salvar alterações' : 'Cadastrar seguro'}
      />
    </form>
  );
}

SeguroForm.propTypes = {
  onSubmit: PropTypes.func.isRequired,
  initialData: PropTypes.object,
  isEditing: PropTypes.bool,
  equipamentosDisponiveis: PropTypes.array,
  unidadesDisponiveis: PropTypes.array,
  onCancel: PropTypes.func,
  anexos: PropTypes.array,
  onDelete: PropTypes.func,
};

export default SeguroForm;
