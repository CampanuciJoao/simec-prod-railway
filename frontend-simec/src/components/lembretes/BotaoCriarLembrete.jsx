import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faPlus } from '@fortawesome/free-solid-svg-icons';

import { Button } from '@/components/ui';
import { useLembretes } from '@/contexts/LembretesContext';

import ModalLembrete from './ModalLembrete';

/**
 * Botão contextual reutilizável que abre o ModalLembrete pre-preenchido com
 * um vínculo a uma entidade específica (OS, equipamento, unidade, seguro,
 * contrato).
 *
 * Uso típico:
 *   <BotaoCriarLembrete
 *     entidadeTipo="OS_CORRETIVA"
 *     entidadeId={os.id}
 *     entidadeLabel={`OS #${os.numeroOs}`}
 *   />
 */
function BotaoCriarLembrete({
  entidadeTipo,
  entidadeId,
  entidadeLabel,
  variant = 'secondary',
  size = 'sm',
  label = 'Lembrete',
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const { recarregar } = useLembretes();

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
        title={entidadeLabel ? `Criar lembrete sobre ${entidadeLabel}` : 'Criar lembrete'}
      >
        <FontAwesomeIcon icon={faBell} />
        {label}
      </Button>

      <ModalLembrete
        open={open}
        onClose={() => setOpen(false)}
        onSaved={() => {
          setOpen(false);
          recarregar?.();
        }}
        entidadeVinculo={
          entidadeTipo && entidadeId
            ? { tipo: entidadeTipo, id: entidadeId, label: entidadeLabel }
            : null
        }
      />
    </>
  );
}

BotaoCriarLembrete.propTypes = {
  entidadeTipo: PropTypes.oneOf(['OS_CORRETIVA', 'EQUIPAMENTO', 'UNIDADE', 'SEGURO', 'CONTRATO']),
  entidadeId: PropTypes.string,
  entidadeLabel: PropTypes.string,
  variant: PropTypes.string,
  size: PropTypes.string,
  label: PropTypes.string,
  className: PropTypes.string,
};

export default BotaoCriarLembrete;
