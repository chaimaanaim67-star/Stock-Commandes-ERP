import React from 'react';

export const SkeletonCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-[32px] border border-[#E8E2DC] dark:border-gray-700 p-6 shadow-sm animate-pulse">
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
  </div>
);

export const SkeletonTable = ({ rows = 5 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 p-4 bg-[#F9F7F5] dark:bg-gray-800 rounded-2xl animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
      </div>
    ))}
  </div>
);

export const SkeletonChart = () => (
  <div className="bg-white dark:bg-gray-800 rounded-[32px] border border-[#E8E2DC] dark:border-gray-700 p-6 shadow-sm animate-pulse">
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6" />
    <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
  </div>
);

export const SkeletonUserRow = () => (
  <div className="flex items-center gap-4 p-4 bg-[#F9F7F5] dark:bg-gray-800 rounded-2xl animate-pulse">
    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
    <div className="flex-1 space-y-2">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
    </div>
    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20" />
  </div>
);

export const SkeletonKpi = () => (
  <div className="bg-white dark:bg-gray-800 rounded-[28px] border border-[#E8E2DC] dark:border-gray-700 p-6 shadow-sm animate-pulse">
    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
  </div>
);
