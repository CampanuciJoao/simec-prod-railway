import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons';

function FieldExtraido({ extraido, children }) {
  if (!extraido) return children;

  return (
    <div className="relative">
      {children}
      <span
        className="pointer-events-none absolute right-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
        style={{
          backgroundColor: 'rgba(34, 197, 94, 0.12)',
          color: 'rgb(22, 163, 74)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
        }}
        title="Preenchido automaticamente pela apólice"
      >
        <FontAwesomeIcon icon={faWandMagicSparkles} className="text-[9px]" />
        Extraído
      </span>
    </div>
  );
}

FieldExtraido.propTypes = {
  extraido: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

export default FieldExtraido;
