import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

import { ModalConfirmacao, Textarea } from '@/components/ui';

// Modal exigindo motivo (mínimo 10 chars) antes de abrir impersonação.
// Padrão Maximo/Nuvolo: ação privilegiada não acontece sem justificativa
// auditável.

const MOTIVO_MIN_LENGTH = 10;

function ImpersonarTenantModal({ tenant, onCancel, onConfirm, loading }) {
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    if (!tenant) setMotivo('');
  }, [tenant]);

  const motivoValido = motivo.trim().length >= MOTIVO_MIN_LENGTH;

  return (
    <ModalConfirmacao
      isOpen={!!tenant}
      onClose={onCancel}
      onConfirm={() => motivoValido && onConfirm(motivo.trim())}
      title={tenant ? `Atuar como "${tenant.nome}"` : 'Atuar como tenant'}
      message="Esta ação abre uma sessão de impersonação registrada na auditoria do plano de controle. Toda escrita feita durante a sessão fica rastreada com seu ID e o tenant alvo."
      confirmText={loading ? 'Iniciando…' : 'Iniciar sessão'}
      confirmDisabled={!motivoValido || loading}
    >
      <div className="mt-3 space-y-3">
        <div
          className="flex items-start gap-2 rounded-xl border p-3 text-xs"
          style={{
            borderColor: 'rgba(234, 179, 8, 0.4)',
            backgroundColor: 'rgba(234, 179, 8, 0.08)',
            color: 'rgb(120, 73, 5)',
          }}
        >
          <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5 shrink-0" />
          <span>
            Durante a sessão você verá os dados do tenant <strong>{tenant?.nome}</strong> em todas as telas.
            Um banner amarelo persistente vai indicar que está atuando como outro tenant — use <em>Sair desta sessão</em> quando terminar.
          </span>
        </div>

        <div>
          <label
            className="text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            Motivo (mín. {MOTIVO_MIN_LENGTH} caracteres) *
          </label>
          <Textarea
            rows={3}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex: Atender chamado de suporte #1234 sobre cadastro de equipamento."
          />
          <p
            className="mt-1 text-xs"
            style={{
              color:
                motivo.length === 0
                  ? 'var(--text-muted)'
                  : motivoValido
                  ? 'var(--color-success)'
                  : 'var(--color-warning)',
            }}
          >
            {motivo.length === 0
              ? 'Obrigatório para auditoria.'
              : motivoValido
              ? `OK (${motivo.trim().length} caracteres)`
              : `Faltam ${MOTIVO_MIN_LENGTH - motivo.trim().length} caracteres.`}
          </p>
        </div>
      </div>
    </ModalConfirmacao>
  );
}

ImpersonarTenantModal.propTypes = {
  tenant: PropTypes.object,
  onCancel: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default ImpersonarTenantModal;
