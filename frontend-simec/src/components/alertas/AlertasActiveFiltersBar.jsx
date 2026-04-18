import PropTypes from 'prop-types';

import { ActiveFiltersBar } from '@/components/ui';

function AlertasActiveFiltersBar(props) {
  return <ActiveFiltersBar className="mb-6" {...props} />;
}

AlertasActiveFiltersBar.propTypes = {
  filters: PropTypes.arrayOf(PropTypes.object),
  onRemove: PropTypes.func.isRequired,
  onClearAll: PropTypes.func.isRequired,
};

export default AlertasActiveFiltersBar;
