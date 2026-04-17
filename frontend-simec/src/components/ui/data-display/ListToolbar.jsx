import React from 'react';
import PropTypes from 'prop-types';
import Card from '@/components/ui/primitives/Card';

function ListToolbar({
  countLabel,
  actions,
  className = '',
}) {
  return (
    <Card className={className}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="ui-text-secondary text-sm font-medium">
          {countLabel}
        </span>

        <div className="flex flex-wrap items-center gap-2">
          {actions}
        </div>
      </div>
    </Card>
  );
}

ListToolbar.propTypes = {
  countLabel: PropTypes.string,
  actions: PropTypes.node,
  className: PropTypes.string,
};

export default ListToolbar;