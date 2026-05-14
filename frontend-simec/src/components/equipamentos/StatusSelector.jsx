import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronDown,
  faSpinner,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';

import { useToast } from '@/contexts/ToastContext';
import { patchEquipamentoStatus } from '@/services/api';
import {
  Button,
  FileDropZone,
  Input,
  ModalConfirmacao,
  Select,
  Textarea,
  getStatusVariant,
} from '@/components/ui';

const STATUS_OPTIONS = [
  'Operante',
  'Inoperante',
  'UsoLimitado',
  'EmManutencao',
  'Desativado',
  'Vendido',
];

const STATUS_INATIVOS = ['Vendido', 'Desativado'];

function formatarStatusParaDisplay(status) {
  if (!status) return '';
  return String(status).replace(/([A-Z])/g, ' $1').trim();
}

function getStatusSelectStyle(variant) {
  switch (variant) {
    case 'green':
      return {
        backgroundColor: 'var(--color-success-soft)',
        borderColor: 'var(--color-success-soft)',
        color: 'var(--color-success)',
      };

    case 'red':
      return {
        backgroundColor: 'var(--color-danger-soft)',
        borderColor: 'var(--color-danger-soft)',
        color: 'var(--color-danger)',
      };

    case 'yellow':
    case 'orange':
      return {
        backgroundColor: 'var(--color-warning-soft)',
        borderColor: 'var(--color-warning-soft)',
        color: 'var(--color-warning)',
      };

    case 'blue':
      return {
        backgroundColor: 'var(--brand-primary-soft)',
        borderColor: 'var(--brand-primary-soft)',
        color: 'var(--brand-primary)',
      };

    default:
      return {
        backgroundColor: 'var(--bg-surface-soft)',
        borderColor: 'var(--border-soft)',
        color: 'var(--text-secondary)',
      };
  }
}

function StatusSelector({ equipamento, onSuccessUpdate }) {
  const [currentStatus, setCurrentStatus] = useState(equipamento.status);
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusPendente, setStatusPendente] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [comprador, setComprador] = useState('');
  const [arquivos, setArquivos] = useState([]);
  const { addToast } = useToast();

  const variant = useMemo(
    () => getStatusVariant(currentStatus),
    [currentStatus]
  );

  const selectStyle = useMemo(
    () => ({
      ...getStatusSelectStyle(variant),
      boxShadow: 'none',
    }),
    [variant]
  );

  const exigeMotivo = statusPendente && (
    STATUS_INATIVOS.includes(statusPendente) ||
    STATUS_INATIVOS.includes(currentStatus)
  );
  const exigeComprador = statusPendente === 'Vendido';

  const podeConfirmar = Boolean(
    statusPendente &&
    (!exigeMotivo || motivo.trim()) &&
    (!exigeComprador || comprador.trim())
  );

  const fecharModal = () => {
    if (isUpdating) return;
    setStatusPendente(null);
    setMotivo('');
    setComprador('');
    setArquivos([]);
  };

  const handleSelectChange = (event) => {
    const novo = event.target.value;
    if (novo === currentStatus) return;
    setStatusPendente(novo);
  };

  const handleArquivosChange = (lista) => setArquivos(lista);

  const removerArquivo = (idx) => {
    setArquivos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleConfirmar = async () => {
    if (!podeConfirmar) return;

    const statusAnterior = currentStatus;
    setIsUpdating(true);

    try {
      const formData = new FormData();
      formData.append('novoStatus', statusPendente);
      if (motivo.trim()) formData.append('motivo', motivo.trim());
      if (exigeComprador) formData.append('comprador', comprador.trim());
      arquivos.forEach((arquivo) => formData.append('file', arquivo));

      await patchEquipamentoStatus(equipamento.id, formData);

      setCurrentStatus(statusPendente);
      onSuccessUpdate?.(equipamento.id, statusPendente);
      addToast(`Status de "${equipamento.modelo}" atualizado!`, 'success');
      setStatusPendente(null);
      setMotivo('');
      setComprador('');
      setArquivos([]);
    } catch (error) {
      setCurrentStatus(statusAnterior);
      addToast(
        error?.response?.data?.message || 'Erro ao atualizar status.',
        'error'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const tituloModal = exigeComprador
    ? 'Registrar venda do equipamento'
    : statusPendente === 'Desativado'
      ? 'Desativar equipamento'
      : STATUS_INATIVOS.includes(currentStatus)
        ? 'Reativar equipamento'
        : `Alterar status para ${formatarStatusParaDisplay(statusPendente || '')}`;

  const mensagemModal = exigeComprador
    ? 'Informe quem adquiriu o equipamento e (opcionalmente) anexe a nota fiscal ou documentos da venda. Este registro entrara no historico de vida e o equipamento deixara de ser monitorado.'
    : statusPendente === 'Desativado'
      ? 'Informe o motivo da desativacao. Equipamentos desativados nao geram alertas, sincronizacoes nem insights da IA.'
      : STATUS_INATIVOS.includes(currentStatus)
        ? 'Informe o motivo pelo qual este equipamento esta sendo reativado.'
        : 'Confirme a mudanca de status. Voce pode adicionar um comentario opcional.';

  return (
    <>
      <div
        className="relative inline-flex w-full min-w-0 items-center sm:max-w-[220px]"
        onClick={(event) => event.stopPropagation()}
      >
        {isUpdating ? (
          <span
            className="pointer-events-none absolute right-9 z-[2] text-[11px]"
            style={{ color: 'var(--text-muted)' }}
          >
            <FontAwesomeIcon icon={faSpinner} spin />
          </span>
        ) : null}

        <span
          className="pointer-events-none absolute right-3 z-[1] text-[10px] opacity-70"
          style={{ color: 'var(--text-muted)' }}
        >
          <FontAwesomeIcon icon={faChevronDown} />
        </span>

        <Select
          value={currentStatus}
          onChange={handleSelectChange}
          disabled={isUpdating}
          className="w-full min-w-0 pr-12 text-sm font-semibold"
          style={selectStyle}
          aria-label={`Alterar status de ${equipamento.modelo}`}
        >
          {STATUS_OPTIONS.map((statusValue) => (
            <option key={statusValue} value={statusValue}>
              {formatarStatusParaDisplay(statusValue)}
            </option>
          ))}
        </Select>
      </div>

      <ModalConfirmacao
        isOpen={Boolean(statusPendente)}
        onClose={fecharModal}
        onConfirm={handleConfirmar}
        title={tituloModal}
        message={mensagemModal}
        confirmText={isUpdating ? 'Salvando...' : 'Confirmar'}
        cancelText="Cancelar"
        confirmDisabled={!podeConfirmar || isUpdating}
        isDestructive={statusPendente && STATUS_INATIVOS.includes(statusPendente)}
      >
        <div className="space-y-4">
          {exigeComprador ? (
            <Input
              label="Comprador"
              value={comprador}
              onChange={(e) => setComprador(e.target.value)}
              placeholder="Nome da clinica/hospital ou pessoa que adquiriu"
              required
              disabled={isUpdating}
            />
          ) : null}

          <Textarea
            label={exigeComprador ? 'Comentario / observacoes' : 'Motivo / comentario'}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder={
              exigeComprador
                ? 'Ex.: Venda fechada em 12/2026, retirada agendada para 20/12.'
                : statusPendente === 'Desativado'
                  ? 'Ex.: Equipamento aguardando descarte, substituido por modelo mais recente...'
                  : 'Opcional: contexto adicional sobre a mudanca.'
            }
            rows={3}
            required={Boolean(exigeMotivo)}
            disabled={isUpdating}
          />

          <div>
            <label
              className="mb-1 block text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              Anexos (opcional)
            </label>
            <FileDropZone
              multiple
              disabled={isUpdating}
              label="Arraste arquivos aqui ou"
              ctaLabel="clique para selecionar"
              onFiles={handleArquivosChange}
            />

            {arquivos.length > 0 ? (
              <ul className="mt-2 space-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {arquivos.map((arq, idx) => (
                  <li key={`${arq.name}-${idx}`} className="flex items-center justify-between gap-3">
                    <span className="truncate">{arq.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removerArquivo(idx)}
                      disabled={isUpdating}
                      aria-label={`Remover ${arq.name}`}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </ModalConfirmacao>
    </>
  );
}

StatusSelector.propTypes = {
  equipamento: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    modelo: PropTypes.string,
    status: PropTypes.string,
  }).isRequired,
  onSuccessUpdate: PropTypes.func,
};

export default StatusSelector;
