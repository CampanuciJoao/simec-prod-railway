import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboardList, faPlay } from '@fortawesome/free-solid-svg-icons';

import { Button, PageSection } from '@/components/ui';
import { ativarProgramaCq } from '@/services/api';

function ProgramaCard({ equipamentoId, equipamentoTipo, onAtivado }) {
  const [ativando, setAtivando] = useState(false);
  const [erro, setErro] = useState(null);

  const handleAtivar = async () => {
    setAtivando(true);
    setErro(null);
    try {
      const r = await ativarProgramaCq(equipamentoId);
      onAtivado?.(r);
    } catch (e) {
      setErro(e?.response?.data?.message || 'Erro ao ativar programa.');
    } finally {
      setAtivando(false);
    }
  };

  return (
    <PageSection>
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              backgroundColor: 'var(--brand-primary-soft)',
              color: 'var(--brand-primary)',
            }}
          >
            <FontAwesomeIcon icon={faClipboardList} />
          </div>
          <div>
            <h4 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Programa de Controle de Qualidade
            </h4>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Equipamento {equipamentoTipo} — RDC ANVISA 611/2022 + IN 90/2021. Ative o programa
              padrão para criar registros pendentes para todos os testes obrigatórios desta modalidade.
            </p>
          </div>
        </div>
        <Button onClick={handleAtivar} disabled={ativando}>
          <FontAwesomeIcon icon={faPlay} />
          <span className="ml-2">{ativando ? 'Ativando...' : 'Ativar programa padrão'}</span>
        </Button>
      </div>
      {erro ? (
        <div
          className="mt-3 rounded-xl px-3 py-2 text-sm"
          style={{
            backgroundColor: 'var(--color-danger-soft)',
            color: 'var(--color-danger)',
          }}
        >
          {erro}
        </div>
      ) : null}
    </PageSection>
  );
}

ProgramaCard.propTypes = {
  equipamentoId: PropTypes.string.isRequired,
  equipamentoTipo: PropTypes.string,
  onAtivado: PropTypes.func,
};

export default ProgramaCard;
