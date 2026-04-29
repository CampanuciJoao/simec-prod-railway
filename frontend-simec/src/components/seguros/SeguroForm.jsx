import React, { useState, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperclip, faXmark, faCloudArrowUp } from '@fortawesome/free-solid-svg-icons';

import { useSeguroForm } from '@/hooks/seguros/useSeguroForm';
import { TIPO_SEGURO_OPTIONS, COBERTURA_FIELDS } from '@/utils/seguros';

import {
  CurrencyInput,
  DateInput,
  FormActions,
  FormSection,
  Input,
  PageState,
  ResponsiveGrid,
  Select,
} from '@/components/ui';

const OPCOES_STATUS = [
  { value: 'Ativo', label: 'Ativo' },
  { value: 'Expirado', label: 'Expirado' },
  { value: 'Cancelado', label: 'Cancelado' },
];

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
  onUpload,
  onDelete,
}) {
  const {
    formData,
    error,
    isSubmitting,
    setIsSubmitting,
    setError,
    coberturaFields,
    equipamentosFiltrados,
    handleChange,
    buildPayload,
  } = useSeguroForm({ initialData, isEditing, equipamentosDisponiveis });

  const [pendingFiles, setPendingFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const ACCEPTED_EXTENSIONS = /\.(pdf|jpe?g|png|docx?)$/i;

  const addFiles = useCallback((files) => {
    const valid = files.filter((f) => ACCEPTED_EXTENSIONS.test(f.name));
    if (valid.length) setPendingFiles((prev) => [...prev, ...valid]);
  }, []);

  const handleFileAdd = (e) => {
    addFiles(Array.from(e.target.files || []));
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragOver(false);
  };

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

      <FormSection
        title="Informações da apólice"
        description="Identificação, vigência e seguradora."
      >
        <ResponsiveGrid preset="form">
          <Select
            label="Tipo de seguro"
            name="tipoSeguro"
            value={formData.tipoSeguro || ''}
            onChange={handleChange}
            options={TIPO_SEGURO_OPTIONS}
            placeholder="Selecione o tipo"
          />

          <Input
            label="Número da apólice"
            name="apoliceNumero"
            value={formData.apoliceNumero || ''}
            onChange={handleChange}
            placeholder="Ex.: APL-2024-001"
            required
          />

          <Input
            label="Seguradora"
            name="seguradora"
            value={formData.seguradora || ''}
            onChange={handleChange}
            placeholder="Ex.: Porto Seguro"
            required
          />

          <CurrencyInput
            label="Prêmio total (R$)"
            name="premioTotal"
            value={formData.premioTotal}
            onChange={handleChange}
            placeholder="R$ 0,00"
          />

          <DateInput
            label="Início da vigência"
            name="dataInicio"
            value={formData.dataInicio || ''}
            onChange={handleChange}
            required
          />

          <DateInput
            label="Fim da vigência"
            name="dataFim"
            value={formData.dataFim || ''}
            onChange={handleChange}
            min={formData.dataInicio || undefined}
            hint="Não pode ser anterior ao início."
            required
          />

          <Select
            label="Status"
            name="status"
            value={formData.status || 'Ativo'}
            onChange={handleChange}
            options={OPCOES_STATUS}
          />
        </ResponsiveGrid>
      </FormSection>

      <FormSection
        title="Vínculo"
        description="Unidade e equipamento cobertos por esta apólice."
      >
        <ResponsiveGrid preset="form">
          <Select
            label="Unidade"
            name="unidadeId"
            value={formData.unidadeId || ''}
            onChange={handleChange}
            options={unidadesDisponiveis.map((u) => ({
              value: u.id,
              label: u.nomeSistema,
            }))}
            placeholder="Selecione a unidade"
          />

          <Select
            label="Equipamento"
            name="equipamentoId"
            value={formData.equipamentoId || ''}
            onChange={handleChange}
            options={equipamentosFiltrados.map((eq) => ({
              value: eq.id,
              label: `${eq.modelo} — ${eq.tag || 'sem tag'}`,
            }))}
            placeholder={
              !formData.unidadeId
                ? 'Selecione a unidade primeiro'
                : 'Selecione o equipamento (opcional)'
            }
            disabled={!formData.unidadeId}
          />
        </ResponsiveGrid>
      </FormSection>

      {coberturaFields.length > 0 ? (
        <FormSection
          title="Coberturas (LMI)"
          description="Limite Máximo de Indenização por cobertura."
        >
          <ResponsiveGrid preset="form">
            {coberturaFields.map((fieldKey) => {
              const config = COBERTURA_FIELDS[fieldKey];
              if (!config) return null;

              return (
                <CurrencyInput
                  key={fieldKey}
                  label={`${config.label} (R$)`}
                  name={fieldKey}
                  value={formData[fieldKey]}
                  onChange={handleChange}
                  placeholder="R$ 0,00"
                />
              );
            })}
          </ResponsiveGrid>
        </FormSection>
      ) : null}

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

          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors"
            style={{
              borderColor: isDragOver ? 'var(--brand-primary)' : 'var(--border-soft)',
              backgroundColor: isDragOver ? 'var(--brand-primary-soft)' : 'var(--bg-surface-soft)',
            }}
          >
            <FontAwesomeIcon
              icon={faCloudArrowUp}
              className="text-3xl"
              style={{ color: isDragOver ? 'var(--brand-primary)' : 'var(--text-muted)' }}
            />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Arraste um arquivo aqui ou{' '}
              <label
                className="cursor-pointer font-medium underline-offset-2 hover:underline"
                style={{ color: 'var(--brand-primary)' }}
              >
                clique para selecionar
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  onChange={handleFileAdd}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
              </label>
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              PDF, JPG, PNG, DOC, DOCX
            </p>
          </div>
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
  onUpload: PropTypes.func,
  onDelete: PropTypes.func,
};

export default SeguroForm;
