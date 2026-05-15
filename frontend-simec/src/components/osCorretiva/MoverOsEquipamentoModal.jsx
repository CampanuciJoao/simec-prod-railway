import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRightLeft, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { Drawer, Button, Select, Textarea } from '@/components/ui';
import { getEquipamentos } from '@/services/api/equipamentosApi';
import { getUnidades } from '@/services/api';
import { equipamentoLabel, equipamentoSortKey } from '@/utils/equipamentos/equipamentoLabel';

function MoverOsEquipamentoModal({ isOpen, onClose, onConfirm, submitting, fieldErrors, osAtual }) {
  const [unidades, setUnidades] = useState([]);
  const [unidadeId, setUnidadeId] = useState('');
  const [equipamentos, setEquipamentos] = useState([]);
  const [novoEquipamentoId, setNovoEquipamentoId] = useState('');
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    getUnidades().then((data) => setUnidades(Array.isArray(data) ? data : [])).catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (!unidadeId) {
      setEquipamentos([]);
      setNovoEquipamentoId('');
      return;
    }
    getEquipamentos({ unidadeId, pageSize: 200 })
      .then((data) => {
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        setEquipamentos(
          items.filter(
            (eq) =>
              eq.id !== osAtual?.equipamentoId &&
              eq.status !== 'Desativado' &&
              eq.status !== 'Vendido',
          ),
        );
      })
      .catch(() => {});
  }, [unidadeId, osAtual?.equipamentoId]);

  function handleClose() {
    setUnidadeId('');
    setEquipamentos([]);
    setNovoEquipamentoId('');
    setMotivo('');
    onClose();
  }

  async function handleConfirm() {
    await onConfirm({ novoEquipamentoId, motivo });
  }

  const podeConfirmar = Boolean(novoEquipamentoId && motivo.trim().length >= 3 && !submitting);

  const unidadeOptions = useMemo(
    () => [
      { value: '', label: 'Selecione a unidade' },
      ...unidades.map((u) => ({ value: u.id, label: u.nomeSistema })),
    ],
    [unidades],
  );

  const equipamentoOptions = useMemo(
    () => [
      {
        value: '',
        label: !unidadeId
          ? 'Selecione a unidade primeiro'
          : equipamentos.length === 0
          ? 'Nenhum equipamento elegível'
          : 'Selecione o novo equipamento',
      },
      ...[...equipamentos]
        .sort((a, b) => equipamentoSortKey(a).localeCompare(equipamentoSortKey(b), 'pt-BR'))
        .map((eq) => ({ value: eq.id, label: equipamentoLabel(eq) })),
    ],
    [equipamentos, unidadeId],
  );

  return (
    <Drawer
      open={isOpen}
      onClose={handleClose}
      title="Mover OS para outro equipamento"
      subtitle={osAtual ? `OS ${osAtual.numeroOS} — atual: ${osAtual.equipamento?.apelido || osAtual.equipamento?.tag}` : ''}
      footer={
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="button" variant="primary" onClick={handleConfirm} disabled={!podeConfirmar}>
            <FontAwesomeIcon icon={faRightLeft} />
            {submitting ? 'Movendo...' : 'Mover OS'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5 p-5">
        <div
          className="flex items-start gap-3 rounded-xl p-4"
          style={{ backgroundColor: 'var(--color-warning-surface)', border: '1px solid var(--color-warning-soft)' }}
        >
          <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5 shrink-0" style={{ color: 'var(--color-warning)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-warning)' }}>
              Reatribuição registrada no histórico
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Esta ação registra um evento no histórico de vida de ambos os equipamentos. O equipamento original
              volta para Operante; o novo recebe o status que estava na abertura da OS.
            </p>
          </div>
        </div>

        <Select
          label="Unidade do novo equipamento"
          value={unidadeId}
          onChange={(e) => setUnidadeId(e.target.value)}
          options={unidadeOptions}
        />

        <div>
          <Select
            label="Novo equipamento *"
            value={novoEquipamentoId}
            onChange={(e) => setNovoEquipamentoId(e.target.value)}
            options={equipamentoOptions}
            disabled={!unidadeId}
          />
          {fieldErrors?.novoEquipamentoId && (
            <p className="mt-1 text-xs text-red-500">{fieldErrors.novoEquipamentoId}</p>
          )}
        </div>

        <div>
          <Textarea
            label="Motivo da reatribuição *"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: OS aberta no equipamento errado por engano. Trata-se na verdade do equipamento X."
            rows={4}
            maxLength={500}
          />
          {fieldErrors?.motivo && <p className="mt-1 text-xs text-red-500">{fieldErrors.motivo}</p>}
        </div>
      </div>
    </Drawer>
  );
}

MoverOsEquipamentoModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  submitting: PropTypes.bool,
  fieldErrors: PropTypes.object,
  osAtual: PropTypes.object,
};

MoverOsEquipamentoModal.defaultProps = {
  submitting: false,
  fieldErrors: {},
  osAtual: null,
};

export default MoverOsEquipamentoModal;
