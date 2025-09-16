/**
 * Common utility functions and constants
 */

// Format numbers for display
export const formatNumber = (num: number): string => {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
};

// Format percentage changes
export const formatChange = (change: number | null | undefined): string => {
  if (change === null || change === undefined) return 'N/A';
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
};

// Common color palette for charts
export const CHART_COLORS = [
  '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', 
  '#EF4444', '#6B7280', '#EC4899', '#14B8A6'
];

// Common tooltip/chart configurations
export const commonChartConfig = {
  tooltip: {
    contentStyle: { backgroundColor: '#1F2937', border: '1px solid #374151' }
  },
  grid: {
    stroke: '#374151',
    strokeDasharray: '3 3'
  },
  axis: {
    tick: { fontSize: 10, fill: '#9CA3AF' }
  }
};