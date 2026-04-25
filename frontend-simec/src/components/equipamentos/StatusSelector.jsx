import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronDown,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';

import { useToast } from '@/contexts/ToastContext';
import { updateEquipamento } from '@/services/api';
import { ModalConfirmacao, Select, Textarea, getStatusVariant } from '@/components/ui';

const STATUS_OPTIONS = [
  'Operante',
  'Inoperante',
  'UsoLimitado',
  'EmManutencao',
  'Desativado',
];

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
  const [showModalDesativacao, setShowModalDesativacao] = useState(false);
  const [motivoDesativacao, setMotivoDesativacao] = useState('');
  const [showModalReativacao, setShowModalReativacao] = useState(false);
  const [motivoReativacao, setMotivoReativacao] = useState('');
  const [statusPendente, setStatusPendente] = useState(null);
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

  const executarUpdate = async (novoStatus, { motivoDesativacao: md, motivoReativacao: mr } = {}) => {
    const statusAnterior = currentStatus;
    setIsUpdating(true);
    setCurrentStatus(novoStatus);

    try {
      await updateEquipamento(equipamento.id, {
        status: novoStatus,
        ...(md ? { motivoDesativacao: md } : {}),
        ...(mr ? { motivoReativacao: mr } : {}),
      });

      onSuccessUpdate?.(equipamento.id, novoStatus);
      addToast(`Status de "${equipamento.modelo}" atualizado!`, 'success');
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

  const handleSelectChange = (event) => {
    const novoStatus = event.target.value;

    if (novoStatus === 'Desativado') {
      setMotivoDesativacao('');
      setShowModalDesativacao(true);
      return;
    }

    if (currentStatus === 'Desativado') {
      setStatusPendente(novoStatus);
      setMotivoReativacao('');
      setShowModalReativacao(true);
      return;
    }

    executarUpdate(novoStatus);
  };

  const handleConfirmarDesativacao = async () => {
    setShowModalDesativacao(false);
    await executarUpdate('Desativado', { motivoDesativacao });
    setMotivoDesativacao('');
  };

  const handleCancelarDesativacao = () => {
    setShowModalDesativacao(false);
    setMotivoDesativacao('');
  };

  const handleConfirmarReativacao = async () => {
    setShowModalReativacao(false);
    await executarUpdate(statusPendente, { motivoReativacao });
    setMotivoReativacao('');
    setStatusPendente(null);
  };

  const handleCancelarReativacao = () => {
    setShowModalReativacao(false);
    setMotivoReativacao('');
    setStatusPendente(null);
  };

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
        isOpen={showModalDesativacao}
        onClose={handleCancelarDesativacao}
        onConfirm={handleConfirmarDesativacao}
        title="Desativar equipamento"
        message="Informe o motivo pelo qual este equipamento está sendo desativado. Esse registro ficará salvo no histórico de vida do equipamento."
        confirmText="Confirmar desativação"
        cancelText="Cancelar"
        isDestructive={false}
        confirmDisabled={!motivoDesativacao.trim()}
      >
        <Textarea
          label="Motivo da desativação"
          value={motivoDesativacao}
          onChange={(e) => setMotivoDesativacao(e.target.value)}
          placeholder="Ex.: Equipamento aguardando descarte, substituído por modelo mais recente..."
          rows={3}
          required
        />
      </ModalConfirmacao>

      <ModalConfirmacao
        isOpen={showModalReativacao}
        onClose={handleCancelarReativacao}
        onConfirm={handleConfirmarReativacao}
        title="Reativar equipamento"
        message="Informe o motivo pelo qual este equipamento está sendo reativado. Esse registro ficará salvo no histórico de vida do equipamento."
        confirmText="Confirmar reativação"
        cancelText="Cancelar"
        confirmDisabled={!motivoReativacao.trim()}
      >
        <Textarea
          label="Motivo da reativação"
          value={motivoReativacao}
          onChange={(e) => setMotivoReativacao(e.target.value)}
          placeholder="Ex.: Novo local definido, equipamento retornou da manutenção..."
          rows={3}
          required
        />
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
