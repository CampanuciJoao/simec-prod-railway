import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboardList } from '@fortawesome/free-solid-svg-icons';
import { Drawer, Button, Select, Textarea } from '@/components/ui';

const STATUS_LABEL = {
  Operante: 'Operante',
  UsoLimitado: 'Uso limitado (em observação)',
  Inoperante: 'Inoperante',
  EmManutencao: 'Em manutenção',
};

const STATUS_OPTIONS = ['Operante', 'UsoLimitado', 'Inoperante', 'EmManutencao'];

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

  function handleClose() {
    setNota('');
    setNovoStatus('');
    onClose();
  }

  async function handleSubmit() {
    if (!nota.trim()) return;
    const payload = { nota };
    if (novoStatus && novoStatus !== statusAtualEquipamento) {
      payload.novoStatusEquipamento = novoStatus;
    }
    await onConfirm(payload);
    setNota('');
    setNovoStatus('');
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
