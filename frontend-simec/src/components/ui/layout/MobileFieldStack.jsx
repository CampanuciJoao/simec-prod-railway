import React from 'react';
import PropTypes from 'prop-types';

function MobileFieldStack({ children, className = '' }) {
  return (
    <div
      className={[
        'flex flex-col gap-4 sm:grid sm:grid-cols-2 sm:gap-4 xl:grid-cols-3',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

MobileFieldStack.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

export default MobileFieldStack;