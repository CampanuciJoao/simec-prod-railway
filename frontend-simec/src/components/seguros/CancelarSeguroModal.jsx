import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBan } from '@fortawesome/free-solid-svg-icons';

import { Button } from '@/components/ui';

function CancelarSeguroModal({ apoliceNumero, onConfirm, onClose, loading }) {
  const [motivo, setMotivo] = useState('');

  const handleConfirm = () => {
    onConfirm(motivo.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="relative z-10 w-full max-w-md rounded-2xl p-6 shadow-xl flex flex-col gap-4"
        style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}
          >
            <FontAwesomeIcon icon={faBan} />
          </div>
          <div>
            <h2 className="font-semibold text-base">Cancelar Apólice</h2>
            <p className="text-sm opacity-60">Apólice {apoliceNumero}</p>
          </div>
        </div>

        <p className="text-sm opacity-70">
          O cancelamento fica registrado no histórico da apólice e não pode ser desfeito.
          A apólice permanecerá acessível no histórico de seguros.
        </p>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="motivo-cancelamento">
            Motivo do cancelamento <span className="opacity-50">(opcional)</span>
          </label>
          <textarea
            id="motivo-cancelamento"
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex: Solicitação da diretoria, substituição por nova apólice..."
            className="w-full resize-none rounded-xl border px-3 py-2.5 text-sm outline-none"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-default)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Voltar
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Cancelando...' : 'Confirmar Cancelamento'}
          </Button>
        </div>
      </div>
    </div>
  );
}

CancelarSeguroModal.propTypes = {
  apoliceNumero: PropTypes.string,
  onConfirm: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default CancelarSeguroModal;
