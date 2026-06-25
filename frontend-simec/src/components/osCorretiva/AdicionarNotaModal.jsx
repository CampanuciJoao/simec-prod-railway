import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClipboardList,
  faPaperclip,
  faXmark,
  faFilePdf,
  faFileImage,
  faFileLines,
} from '@fortawesome/free-solid-svg-icons';
import { Drawer, Button, Select, Textarea } from '@/components/ui';

const STATUS_LABEL = {
  Operante: 'Operante',
  UsoLimitado: 'Uso limitado (em observação)',
  Inoperante: 'Inoperante',
  EmManutencao: 'Em manutenção',
};

const STATUS_OPTIONS = ['Operante', 'UsoLimitado', 'Inoperante', 'EmManutencao'];

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx';
const MAX_FILES = 10;
const MAX_FILE_SIZE_MB = 15;

function iconePorTipo(nome = '', mime = '') {
  const n = nome.toLowerCase();
  const m = mime.toLowerCase();
  if (m.includes('pdf') || n.endsWith('.pdf')) return { icon: faFilePdf, className: 'text-red-500' };
  if (m.includes('image') || /\.(png|jpe?g|webp)$/.test(n)) return { icon: faFileImage, className: 'text-emerald-500' };
  return { icon: faFileLines, className: 'text-slate-400' };
}

function formatarTamanho(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function AdicionarNotaModal({
  isOpen,
  onClose,
  onConfirm,
  submitting,
  fieldErrors,
  statusAtualEquipamento,
}) {
  const [nota, setNota] = useState('');
  const [novoStatus, setNovoStatus] = useState('');
  const [arquivos, setArquivos] = useState([]);
  const [erroArquivo, setErroArquivo] = useState('');
  const inputRef = useRef(null);

  function reset() {
    setNota('');
    setNovoStatus('');
    setArquivos([]);
    setErroArquivo('');
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSelecionarArquivos(event) {
    const novos = Array.from(event.target.files || []);
    if (inputRef.current) inputRef.current.value = '';
    if (!novos.length) return;

    setErroArquivo('');

    const limiteBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
    const acima = novos.find((f) => f.size > limiteBytes);
    if (acima) {
      setErroArquivo(`"${acima.name}" excede o limite de ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    setArquivos((prev) => {
      const combinados = [...prev, ...novos];
      if (combinados.length > MAX_FILES) {
        setErroArquivo(`Máximo de ${MAX_FILES} arquivos por andamento.`);
        return combinados.slice(0, MAX_FILES);
      }
      return combinados;
    });
  }

  function removerArquivo(idx) {
    setArquivos((prev) => prev.filter((_, i) => i !== idx));
    setErroArquivo('');
  }

  async function handleSubmit() {
    if (!nota.trim()) return;
    const payload = { nota };
    if (novoStatus && novoStatus !== statusAtualEquipamento) {
      payload.novoStatusEquipamento = novoStatus;
    }
    if (arquivos.length) {
      payload.arquivos = arquivos;
    }
    await onConfirm(payload);
    reset();
  }

  return (
    <Drawer
      open={isOpen}
      onClose={handleClose}
      title="Registrar andamento"
      subtitle="Registre uma ação realizada ou observação relevante na OS"
      footer={
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" onClick={handleSubmit} disabled={submitting || !nota.trim()}>
            <FontAwesomeIcon icon={faClipboardList} />
            {submitting ? 'Salvando...' : 'Registrar andamento'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 p-5">
        <Textarea
          label="Descrição do andamento *"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Descreva a ação realizada, o status atual ou qualquer observação relevante..."
          rows={6}
          maxLength={2000}
        />
        {fieldErrors?.nota && (
          <p className="text-xs text-red-500">{fieldErrors.nota}</p>
        )}

        <div>
          <Select
            label="Atualizar status do equipamento (opcional)"
            value={novoStatus}
            onChange={(e) => setNovoStatus(e.target.value)}
          >
            <option value="">Não alterar</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s} disabled={s === statusAtualEquipamento}>
                {STATUS_LABEL[s]}{s === statusAtualEquipamento ? ' (atual)' : ''}
              </option>
            ))}
          </Select>
          {fieldErrors?.novoStatusEquipamento && (
            <p className="mt-1 text-xs text-red-500">{fieldErrors.novoStatusEquipamento}</p>
          )}
          {statusAtualEquipamento ? (
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              Status atual: <strong>{STATUS_LABEL[statusAtualEquipamento] || statusAtualEquipamento}</strong>.
              Mudança fica registrada no histórico do ativo.
            </p>
          ) : null}
        </div>

        {/* Anexos: bloco compacto. Quando ha arquivos selecionados,
            aparece a lista enxuta acima do botao de adicionar. */}
        <div>
          {arquivos.length > 0 && (
            <ul className="mb-2 space-y-1.5">
              {arquivos.map((f, idx) => {
                const { icon, className } = iconePorTipo(f.name, f.type);
                return (
                  <li
                    key={`${f.name}-${idx}`}
                    className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs"
                    style={{ borderColor: 'var(--border-soft)', backgroundColor: 'var(--bg-surface-soft)' }}
                  >
                    <FontAwesomeIcon icon={icon} className={className} />
                    <span className="min-w-0 flex-1 truncate" style={{ color: 'var(--text-primary)' }} title={f.name}>
                      {f.name}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>{formatarTamanho(f.size)}</span>
                    <button
                      type="button"
                      onClick={() => removerArquivo(idx)}
                      disabled={submitting}
                      className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                      style={{ color: 'var(--text-muted)' }}
                      title="Remover"
                    >
                      <FontAwesomeIcon icon={faXmark} className="text-xs" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={handleSelecionarArquivos}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={submitting || arquivos.length >= MAX_FILES}
            className="inline-flex items-center gap-1.5 text-xs font-medium transition hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            style={{ color: 'var(--brand-primary)' }}
          >
            <FontAwesomeIcon icon={faPaperclip} />
            {arquivos.length ? 'Adicionar mais arquivos' : 'Anexar arquivos (opcional)'}
          </button>

          {erroArquivo && (
            <p className="mt-1 text-xs text-red-500">{erroArquivo}</p>
          )}
        </div>

        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Notas são imutáveis após salvas — fazem parte do histórico de auditoria da OS.
        </p>
      </div>
    </Drawer>
  );
}

AdicionarNotaModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
  fieldErrors: PropTypes.object,
  statusAtualEquipamento: PropTypes.string,
};

AdicionarNotaModal.defaultProps = {
  submitting: false,
  fieldErrors: {},
  statusAtualEquipamento: null,
};

export default AdicionarNotaModal;
