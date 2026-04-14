import React from 'react';
import PropTypes from 'prop-types';

function buildGridClasses(cols = {}) {
  const { base = 1, sm, md, lg, xl } = cols;
  const classes = ['grid', `grid-cols-${base}`];

  if (sm) classes.push(`sm:grid-cols-${sm}`);
  if (md) classes.push(`md:grid-cols-${md}`);
  if (lg) classes.push(`lg:grid-cols-${lg}`);
  if (xl) classes.push(`xl:grid-cols-${xl}`);

  return classes.join(' ');
}

const PRESETS = {
  form: { base: 1, md: 2, xl: 3 },
  details: { base: 1, md: 2, xl: 3 },
  cards: { base: 1, md: 2, xl: 3 },
  compact: { base: 1, sm: 2, md: 3, xl: 4 },
  twoCols: { base: 1, md: 2 },
};

function ResponsiveGrid({
  children,
  cols,
  preset,
  gap = 'gap-4',
  className = '',
}) {
  const config = preset ? PRESETS[preset] : cols || { base: 1 };

  return (
    <div className={[buildGridClasses(config), gap, className].join(' ')}>
      {children}
    </div>
  );
}

ResponsiveGrid.propTypes = {
  children: PropTypes.node.isRequired,
  cols: PropTypes.object,
  preset: PropTypes.oneOf(['form', 'details', 'cards', 'compact', 'twoCols']),
  gap: PropTypes.string,
  className: PropTypes.string,
};

export default ResponsiveGrid;