import PropTypes from 'prop-types';

import { ActiveFiltersBar } from '@/components/ui';

function RelatoriosActiveFiltersBar(props) {
  return <ActiveFiltersBar {...props} />;
}

RelatoriosActiveFiltersBar.propTypes = {
  filters: PropTypes.array,
  onRemove: PropTypes.func.isRequired,
  onClearAll: PropTypes.func.isRequired,
};

export default RelatoriosActiveFiltersBar;
