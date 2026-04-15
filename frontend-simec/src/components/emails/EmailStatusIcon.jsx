import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle } from '@fortawesome/free-solid-svg-icons';

function EmailStatusIcon({ ativo = false }) {
  return (
    <span
      className={[
        'inline-flex items-center justify-center rounded-full text-base',
        ativo ? 'text-emerald-600' : 'text-red-500',
      ].join(' ')}
      title={ativo ? 'Sim' : 'Não'}
    >
      <FontAwesomeIcon icon={ativo ? faCheckCircle : faTimesCircle} />
    </span>
  );
}

EmailStatusIcon.propTypes = {
  ativo: PropTypes.bool,
};

export default EmailStatusIcon;