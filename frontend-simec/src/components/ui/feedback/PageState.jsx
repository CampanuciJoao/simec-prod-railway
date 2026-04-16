import React from 'react';
import PropTypes from 'prop-types';

import EmptyState from '@/components/ui/layout/EmptyState';
import LoadingState from './LoadingState';

function PageState({
  loading = false,
  error = '',
  isEmpty = false,
  emptyMessage = 'Nenhum dado disponível.',
}) {
  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (isEmpty) {
    return <EmptyState message={emptyMessage} />;
  }

  return null;
}

PageState.propTypes = {
  loading: PropTypes.bool,
  error: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  isEmpty: PropTypes.bool,
  emptyMessage: PropTypes.string,
};

export default PageState;