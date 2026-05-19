import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPaperclip,
  faXmark,
  faWandMagicSparkles,
  faSpinner,
  faCircleExclamation,
  faLock,
} from '@fortawesome/free-solid-svg-icons';

import { useSeguroForm } from '@/hooks/seguros/useSeguroForm';
import { useApoliceExtractor } from '@/hooks/seguros/useApoliceExtractor';
import { TIPO_SEGURO_OPTIONS, COBERTURA_FIELDS } from '@/utils/seguros';

import {
  CurrencyInput,
  DateInput,
  FileDropZone,
  FormActions,
  FormSection,
  Input,
  PageState,
  ResponsiveGrid,
  Select,
} from '@/components/ui';
import { equipamentoLabel, equipamentoSortKey } from '@/utils/equipamentos/equipamentoLabel';

const OPCOES_STATUS = [
  { value: 'Ativo', label: 'Ativo' },
  { value: 'Expirado', label: 'Expirado' },
  { value: 'Cancelado', label: 'Cancelado' },
];

// ─── Helper: badge "Extraído da apólice" ────────────────────────────────────
function FieldExtraido({ extraido, children }) {
  if (!extraido) return children;

  return (
    <div className="relative">
      {children}
      <span
        className="pointer-events-none absolute right-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
        style={{
          backgroundColor: 'rgba(34, 197, 94, 0.12)',
          color: 'rgb(22, 163, 74)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
        }}
        title="Preenchido automaticamente pela apólice"
      >
        <FontAwesomeIcon icon={faWandMagicSparkles} className="text-[9px]" />
        Extraído
      </span>
    </div>
  );
}

FieldExtraido.propTypes = {
  extraido: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

// ─── Bloco de extração via IA ───────────────────────────────────────────────
function ExtracaoApoliceCard({
  extraindo,
  requerSenha,
  senhaInvalida,
  erro,
  avisos,
  onDropPdf,
  onEnviarSenha,
  onCancelarSenha,
}) {
  const [senha, setSenha] = useState('');

  const handleSubmitSenha = (e) => {
    e.preventDefault();
    if (senha.trim()) {
      onEnviarSenha(senha.trim());
    }
  };

  if (requerSenha) {
    return (
      <div
        className="rounded-2xl border p-4"
        style={{
          borderColor: 'rgba(234, 179, 8, 0.4)',
          backgroundColor: 'rgba(234, 179, 8, 0.06)',
        }}
      >
        <div className="mb-3 flex items-center gap-2 text-sm font-medium" style={{ color: 'rgb(161, 98, 7)' }}>
          <FontAwesomeIcon icon={faLock} />
          PDF protegido por senha
        </div>
        <form onSubmit={handleSubmitSenha} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="password"
            autoFocus
            placeholder="Digite a senha do PDF"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="input flex-1"
            disabled={extraindo}
          />
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={extraindo || !senha.trim()}>
              {extraindo ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> Extraindo…
                </>
              ) : (
                'Extrair'
              )}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onCancelarSenha} disabled={extraindo}>
              Cancelar
            </button>
          </div>
        </form>
        {senhaInvalida ? (
          <p className="mt-2 text-xs" style={{ color: 'var(--color-danger)' }}>
            Senha incorreta. Tente novamente.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor: 'var(--border-soft)',
        backgroundColor: 'var(--bg-surface-soft)',
      }}
    >
      <div className="mb-3 flex items-start gap-3">
        <FontAwesomeIcon icon={faWandMagicSparkles} className="mt-0.5 text-base" style={{ color: 'var(--brand-primary)' }} />
        <div className="min-w-0">
          <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Tem a apólice em PDF?
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Arraste o arquivo aqui e a IA preenche os campos abaixo automaticamente.
          </div>
        </div>
      </div>

      <FileDropZone
        accept=".pdf"
        multiple={false}
        label={extraindo ? 'Lendo apólice…' : 'Arraste a apólice em PDF ou'}
        ctaLabel={extraindo ? '' : 'clique para selecionar'}
        hint={extraindo ? 'Pode levar alguns segundos' : 'Aceita PDF de seguradoras como Tokio Marine, Bradesco, MAPFRE, HDI etc.'}
        onFiles={onDropPdf}
        disabled={extraindo}
      />

      {extraindo ? (
        <div className="mt-3 flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
          A IA está lendo o documento…
        </div>
      ) : null}

      {erro ? (
        <div
          className="mt-3 flex items-start gap-2 rounded-lg p-2 text-xs"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            color: 'var(--color-danger)',
          }}
        >
          <FontAwesomeIcon icon={faCircleExclamation} className="mt-0.5" />
          <span>{erro.message}</span>
        </div>
      ) : null}

      {avisos.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1.5">
          {avisos.map((a, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded-lg p-2 text-xs"
              style={{
                backgroundColor: 'rgba(234, 179, 8, 0.08)',
                color: 'rgb(161, 98, 7)',
              }}
            >
              <FontAwesomeIcon icon={faCircleExclamation} className="mt-0.5 shrink-0" />
              <span>{a.mensagem}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

ExtracaoApoliceCard.propTypes = {
  extraindo: PropTypes.bool,
  requerSenha: PropTypes.bool,
  senhaInvalida: PropTypes.bool,
  erro: PropTypes.object,
  avisos: PropTypes.array,
  onDropPdf: PropTypes.func.isRequired,
  onEnviarSenha: PropTypes.func.isRequired,
  onCancelarSenha: PropTypes.func.isRequired,
};

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

  // ─── Extração de PDF via IA ──────────────────────────────────────────────
  const {
    extraindo,
    erro: erroExtracao,
    requerSenha,
    senhaInvalida,
    extrair,
    extrairComSenha,
    cancelar: cancelarSenha,
  } = useApoliceExtractor();

  // Set de campos preenchidos pela IA — limpa quando o usuário edita.
  const [camposExtraidos, setCamposExtraidos] = useState(() => new Set());
  const [avisosExtracao, setAvisosExtracao] = useState([]);

  const aplicarExtracao = useCallback(
    (data, arquivo) => {
      const camposPreenchidos = new Set();
      const merged = { ...formData };

      Object.entries(data.campos || {}).forEach(([key, value]) => {
        // Só aplica se veio valor válido
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

      // Adiciona o PDF original aos arquivos pendentes (vai virar anexo no submit)
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
      // Se requerSenha, o card de extração vai mostrar o input automaticamente
      // (estado vem do hook). Guardamos o arquivo no hook via arquivoPendente.
    },
    [extrair, aplicarExtracao]
  );

  const handleEnviarSenha = useCallback(
    async (senha) => {
      const resultado = await extrairComSenha(senha);
      if (resultado.sucesso) {
        // Precisamos do arquivo original pra anexar — o hook guarda em
        // arquivoPendente, mas não expõe. Recupera via resultado.data se o
        // backend retornar, ou regenera a partir do que sabemos.
        // Por enquanto, aplica os campos sem anexar (usuário pode anexar
        // manualmente se quiser).
        aplicarExtracao(resultado.data, null);
      }
    },
    [extrairComSenha, aplicarExtracao]
  );

  // handleChange wrapper: remove o badge "extraído" quando o usuário edita
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

      <FormSection
        title="Informações da apólice"
        description="Identificação, vigência e seguradora."
      >
        <ResponsiveGrid preset="form">
          <FieldExtraido extraido={camposExtraidos.has('tipoSeguro')}>
            <Select
              label="Tipo de seguro"
              name="tipoSeguro"
              value={formData.tipoSeguro || ''}
              onChange={handleChange}
              options={TIPO_SEGURO_OPTIONS}
              placeholder="Selecione o tipo"
            />
          </FieldExtraido>

          <FieldExtraido extraido={camposExtraidos.has('apoliceNumero')}>
            <Input
              label="Número da apólice"
              name="apoliceNumero"
              value={formData.apoliceNumero || ''}
              onChange={handleChange}
              placeholder="Ex.: APL-2024-001"
              required
            />
          </FieldExtraido>

          <FieldExtraido extraido={camposExtraidos.has('seguradora')}>
            <Input
              label="Seguradora"
              name="seguradora"
              value={formData.seguradora || ''}
              onChange={handleChange}
              placeholder="Ex.: Porto Seguro"
              required
            />
          </FieldExtraido>

          <FieldExtraido extraido={camposExtraidos.has('premioTotal')}>
            <CurrencyInput
              label="Prêmio total (R$)"
              name="premioTotal"
              value={formData.premioTotal}
              onChange={handleChange}
              placeholder="R$ 0,00"
            />
          </FieldExtraido>

          <FieldExtraido extraido={camposExtraidos.has('dataInicio')}>
            <DateInput
              label="Início da vigência"
              name="dataInicio"
              value={formData.dataInicio || ''}
              onChange={handleChange}
              required
            />
          </FieldExtraido>

          <FieldExtraido extraido={camposExtraidos.has('dataFim')}>
            <DateInput
              label="Fim da vigência"
              name="dataFim"
              value={formData.dataFim || ''}
              onChange={handleChange}
              min={formData.dataInicio || undefined}
              hint="Não pode ser anterior ao início."
              required
            />
          </FieldExtraido>

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
          <FieldExtraido extraido={camposExtraidos.has('unidadeId')}>
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
          </FieldExtraido>

          <FieldExtraido extraido={camposExtraidos.has('equipamentoId')}>
            <Select
              label="Equipamento"
              name="equipamentoId"
              value={formData.equipamentoId || ''}
              onChange={handleChange}
              options={[...equipamentosFiltrados]
                .sort((a, b) => equipamentoSortKey(a).localeCompare(equipamentoSortKey(b), 'pt-BR'))
                .map((eq) => ({ value: eq.id, label: equipamentoLabel(eq) }))}
              placeholder={
                !formData.unidadeId
                  ? 'Selecione a unidade primeiro'
                  : 'Selecione o equipamento (opcional)'
              }
              disabled={!formData.unidadeId}
            />
          </FieldExtraido>
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
                <FieldExtraido key={fieldKey} extraido={camposExtraidos.has(fieldKey)}>
                  <CurrencyInput
                    label={`${config.label} (R$)`}
                    name={fieldKey}
                    value={formData[fieldKey]}
                    onChange={handleChange}
                    placeholder="R$ 0,00"
                  />
                </FieldExtraido>
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
