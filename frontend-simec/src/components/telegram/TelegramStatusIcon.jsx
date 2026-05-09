import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';

function TelegramStatusIcon({ ativo }) {
  return ativo ? (
    <FontAwesomeIcon icon={faCheck} className="text-green-500" />
  ) : (
    <FontAwesomeIcon icon={faXmark} className="text-slate-300" />
  );
}

TelegramStatusIcon.propTypes = { ativo: PropTypes.bool.isRequired };

export default TelegramStatusIcon;
