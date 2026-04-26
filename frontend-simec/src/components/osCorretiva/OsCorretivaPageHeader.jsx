import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faWrench } from '@fortawesome/free-solid-svg-icons';
import { Button } from '@/components/ui';

function OsCorretivaPageHeader({ onCreate }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <FontAwesomeIcon icon={faWrench} className="text-xl" style={{ color: 'var(--brand-primary)' }} />
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Ocorrências e OS Corretivas
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Registro de ocorrências e ordens de serviço corretivas
          </p>
        </div>
      </div>

      <Button type="button" variant="primary" onClick={onCreate}>
        <FontAwesomeIcon icon={faPlus} />
        Registrar Ocorrência
      </Button>
    </div>
  );
}

OsCorretivaPageHeader.propTypes = {
  onCreate: PropTypes.func.isRequired,
};

export default OsCorretivaPageHeader;
