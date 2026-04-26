import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRightFromSquare, faWrench } from '@fortawesome/free-solid-svg-icons';

import { PageSection } from '@/components/ui';

function TabFichaTecnica({ equipamentoId }) {
  return (
    <PageSection
      title="Ocorrencias corretivas"
      description="O registro e acompanhamento de ocorrencias corretivas esta centralizado no modulo de Manutencoes."
    >
      <Link
        to={`/manutencoes?tipo=Corretiva&equipamentoId=${equipamentoId}`}
        className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition"
        style={{
          backgroundColor: 'var(--brand-primary-soft)',
          color: 'var(--brand-primary)',
        }}
      >
        <FontAwesomeIcon icon={faWrench} />
        Ver OS corretivas deste equipamento
        <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-xs" />
      </Link>
    </PageSection>
  );
}

TabFichaTecnica.propTypes = {
  equipamentoId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    .isRequired,
};

export default TabFichaTecnica;
