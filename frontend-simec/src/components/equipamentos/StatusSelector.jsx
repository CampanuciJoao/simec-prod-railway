import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faChevronDown } from '@fortawesome/free-solid-svg-icons';

import { useToast } from '@/contexts/ToastContext';
import { updateEquipamento } from '@/services/api';
import { getStatusBadgeVariant } from '@/components/ui/uistyles/statusStyles';

const STATUS_OPTIONS = [
  'Operante',
  'Inoperante',
  'UsoLimitado',
  'EmManutencao',
];

const STATUS_SELECT_STYLES = {
  green:
    'border-emerald-200 bg-emerald-50 text-emerald-700 focus:border-emerald-400 focus:ring-emerald-100',
  red:
    'border-red-200 bg-red-50 text-red-700 focus:border-red-400 focus:ring-red-100',
  yellow:
    'border-amber-200 bg-amber-50 text-amber-700 focus:border-amber-400 focus:ring-amber-100',
  blue:
    'border-blue-200 bg-blue-50 text-blue-700 focus:border-blue-400 focus:ring-blue-100',
  slate:
    'border-slate-200 bg-slate-50 text-slate-700 focus:border-slate-400 focus:ring-slate-100',
};

const formatarStatusParaDisplay = (status) => {
  if (!status) return '';
  return String(status).replace(/([A-Z])/g, ' $1').trim();
};

function StatusSelector({ equipamento, onSuccessUpdate }) {
  const [currentStatus, setCurrentStatus] = useState(equipamento.status);
  const [isUpdating, setIsUpdating] = useState(false);
  const { addToast } = useToast();

  const variant = useMemo(
    () => getStatusBadgeVariant(currentStatus),
    [currentStatus]
  );

  const colorClass =
    STATUS_SELECT_STYLES[variant] || STATUS_SELECT_STYLES.slate;

  const handleSelectChange = async (e) => {
    const novoStatus = e.target.value;
    const statusAnterior = currentStatus;

    setIsUpdating(true);
    setCurrentStatus(novoStatus);

    try {
      await updateEquipamento(equipamento.id, { status: novoStatus });

      if (typeof onSuccessUpdate === 'function') {
        onSuccessUpdate(equipamento.id, novoStatus);
      }

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

  return (
    <div
      className="relative inline-flex w-full min-w-[140px] max-w-[200px] items-center"
      onClick={(e) => e.stopPropagation()}
    >
      {isUpdating && (
        <span className="pointer-events-none absolute right-8 z-10 text-[11px] text-slate-400">
          <FontAwesomeIcon icon={faSpinner} spin />
        </span>
      )}

      <select
        value={currentStatus}
        onChange={handleSelectChange}
        disabled={isUpdating}
        className={[
          'w-full appearance-none rounded-xl border px-3 py-2 pr-8 text-sm font-semibold leading-none outline-none transition',
          'focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60',
          colorClass,
        ].join(' ')}
        aria-label={`Alterar status de ${equipamento.modelo}`}
      >
        {STATUS_OPTIONS.map((statusValue) => (
          <option key={statusValue} value={statusValue}>
            {formatarStatusParaDisplay(statusValue)}
          </option>
        ))}
      </select>

      <span className="pointer-events-none absolute right-2.5 text-[10px] opacity-70">
        <FontAwesomeIcon icon={faChevronDown} />
      </span>
    </div>
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