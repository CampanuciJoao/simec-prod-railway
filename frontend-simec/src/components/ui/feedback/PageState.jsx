import React from 'react';
import { EmptyState } from '@/components/ui/layout';
import LoadingState from './LoadingState';

function PageState({
  loading = false,
  error = '',
  isEmpty = false,
  emptyMessage = 'Nenhum dado encontrado.',
}) {
  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
        {error}
      </div>
    );
  }

  if (isEmpty) {
    return <EmptyState message={emptyMessage} />;
  }

  return null;
}

export default PageState;