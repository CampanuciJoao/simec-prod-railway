import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

function PageState({
  loading,
  error,
  isEmpty,
  emptyMessage = 'Nenhum dado encontrado.',
}) {
  if (loading) {
    return (
      <div className="page-content-wrapper centered-loader">
        <FontAwesomeIcon icon={faSpinner} spin size="3x" color="#3b82f6" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content-wrapper">
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-2">
          <FontAwesomeIcon icon={faTriangleExclamation} />
          {error}
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="page-content-wrapper">
        <div className="py-20 text-center text-slate-400 italic bg-white rounded-2xl border border-dashed border-slate-200">
          {emptyMessage}
        </div>
      </div>
    );
  }

  return null;
}

export default PageState;