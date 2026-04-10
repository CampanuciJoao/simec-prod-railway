// src/components/ui/SkeletonCard.jsx

import React from 'react';

const SkeletonCard = () => {
  return (
    <div className="w-full p-6 mb-4 border border-gray-100 rounded-2xl bg-white animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="h-12 w-12 bg-gray-200 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-200 rounded w-1/4" />
          <div className="h-6 bg-gray-200 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
};

export default SkeletonCard;