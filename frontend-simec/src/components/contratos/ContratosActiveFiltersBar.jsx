import PropTypes from 'prop-types';

import { ActiveFiltersBar } from '@/components/ui';

function ContratosActiveFiltersBar(props) {
  return <ActiveFiltersBar {...props} />;
}

ContratosActiveFiltersBar.propTypes = {
  filters: PropTypes.array,
  onRemove: PropTypes.func.isRequired,
  onClearAll: PropTypes.func.isRequired,
};

export default ContratosActiveFiltersBar;
