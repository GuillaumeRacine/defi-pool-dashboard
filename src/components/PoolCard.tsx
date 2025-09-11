/**
 * Pool Card Component
 * Displays pool information with quality indicators and direct verification links
 */

import Link from 'next/link';
import { PoolData } from '@/types/pool';
import { formatDistanceToNow } from 'date-fns';

interface PoolCardProps {
  pool: PoolData;
  contractKey: string;
}

export default function PoolCard({ pool, contractKey }: PoolCardProps) {
  const getQualityColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 80) return 'text-yellow-600 bg-yellow-100';
    if (score >= 60) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const formatTVL = (tvl: number) => {
    if (tvl >= 1e9) return `$${(tvl / 1e9).toFixed(2)}B`;
    if (tvl >= 1e6) return `$${(tvl / 1e6).toFixed(2)}M`;
    if (tvl >= 1e3) return `$${(tvl / 1e3).toFixed(2)}K`;
    return `$${tvl.toFixed(2)}`;
  };

  const latestData = pool.timeseries[pool.timeseries.length - 1];
  const currentTVL = pool.orca_augmentation?.orca_metrics?.current_liquidity || latestData?.tvl_usd || 0;
  const currentAPY = pool.orca_augmentation?.orca_metrics?.apy_24h || latestData?.apy;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {pool.pool_name}
          </h3>
          <p className="text-sm text-gray-500">
            {pool.protocol} • {pool.blockchain}
          </p>
        </div>
        
        {/* Quality Score Badge */}
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getQualityColor(pool.data_quality_score)}`}>
          Quality: {pool.data_quality_score}/100
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-500">Total Value Locked</p>
          <p className="text-xl font-semibold text-gray-900">
            {formatTVL(currentTVL)}
          </p>
        </div>
        
        {currentAPY && (
          <div>
            <p className="text-sm text-gray-500">APY (24h)</p>
            <p className="text-xl font-semibold text-green-600">
              {currentAPY.toFixed(2)}%
            </p>
          </div>
        )}
      </div>

      {/* Data Points & Freshness */}
      <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
        <span>{pool.data_points} data points</span>
        <span>
          Updated {formatDistanceToNow(new Date(pool.last_updated), { addSuffix: true })}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Link
          href={`/pools/${encodeURIComponent(contractKey)}`}
          className="flex-1 bg-blue-600 text-white text-center py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
        >
          View Details
        </Link>
        
        {/* Explorer Link */}
        {pool.composition?.solscan_link && (
          <a
            href={pool.composition.solscan_link}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="View on Solscan"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>

      {/* Data Sources */}
      {pool.data_sources.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Sources: {pool.data_sources.join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}