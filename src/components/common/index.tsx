/**
 * Common reusable components
 */

import React from 'react';

// Common loading component
export const LoadingCard = ({ title, rows = 5 }: { title?: string; rows?: number }) => (
  <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
    <div className="animate-pulse">
      {title && <div className="h-6 bg-gray-700 rounded w-48 mb-4"></div>}
      <div className="space-y-3">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-700 rounded"></div>
        ))}
      </div>
    </div>
  </div>
);

// Common error component
export const ErrorCard = ({ title, error }: { title: string; error: string }) => (
  <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
    <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
    <div className="text-red-400 text-sm">
      Error loading data: {error}
    </div>
  </div>
);

// Common expandable row component
export const ExpandButton = ({ 
  isExpanded, 
  onClick, 
  title 
}: { 
  isExpanded: boolean; 
  onClick: () => void; 
  title?: string;
}) => (
  <button
    onClick={onClick}
    className="text-blue-400 hover:text-blue-300 p-1 rounded transition-colors"
    title={title || (isExpanded ? 'Hide details' : 'Show details')}
  >
    <svg 
      className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  </button>
);

// Raw data viewer component
export const RawDataViewer = ({ data, title }: { data: any; title: string }) => (
  <div className="mt-6 pt-4 border-t border-gray-600">
    <details>
      <summary className="text-gray-400 cursor-pointer hover:text-gray-300 text-sm mb-2">
        🔍 View Raw API Data (JSON)
      </summary>
      <pre className="bg-black rounded p-3 text-xs text-green-400 overflow-auto max-h-64">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  </div>
);