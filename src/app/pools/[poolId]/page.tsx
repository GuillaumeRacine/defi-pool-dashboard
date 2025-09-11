/**
 * Pool Detail Page
 * Displays comprehensive pool information with historical charts and metadata
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import PoolChart from '@/components/PoolChart';
import { defiLlamaAPI } from '@/lib/defi-api';
import { PoolData } from '@/types/pool';

export default function PoolDetailPage() {
  const params = useParams();
  const router = useRouter();
  const poolId = decodeURIComponent(params.poolId as string);
  
  const [pool, setPool] = useState<PoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (poolId) {
      loadPoolDetails();
    }
  }, [poolId]);

  const loadPoolDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Extract contract address from universal ID
      const parts = poolId.split(':');
      const contractAddress = parts.length > 1 ? parts[1] : poolId;
      const blockchain = parts.length > 1 ? parts[0] : 'unknown';

      // For now, we'll get fresh data from DefiLlama
      // In a real app, this would come from a database or cache
      const response = await defiLlamaAPI.getCurrentYields();
      
      if (response.error) {
        throw new Error(response.error);
      }

      // Find the specific pool
      const poolData = response.data?.find(p => 
        p.pool === contractAddress || 
        `${p.chain?.toLowerCase()}:${p.pool}` === poolId
      );

      if (!poolData) {
        throw new Error('Pool not found');
      }

      // Get historical data
      const historicalResponse = await defiLlamaAPI.getPoolHistoricalData(poolData.pool);
      const timeseries = historicalResponse.data || [];

      // Create pool data object
      const transformedPool: PoolData = {
        universal_id: poolId,
        contract_address: contractAddress,
        blockchain: blockchain as any,
        pool_name: poolData.symbol || 'Unknown Pool',
        protocol: poolData.project || 'Unknown',
        timeseries: timeseries,
        data_points: timeseries.length,
        data_quality_score: 0,
        validation_passed: false,
        data_sources: ['defillama'],
        last_updated: new Date().toISOString(),
        created_at: new Date().toISOString(),
        composition: {
          composition_note: 'Pool composition data requires additional API integration',
          explorer_links: {
            defillama: `https://defillama.com/pool/${poolData.pool}`
          }
        }
      };

      // Validate data quality
      const validation = defiLlamaAPI.validatePoolData(transformedPool);
      transformedPool.data_quality_score = validation.score;
      transformedPool.validation_passed = validation.passed;

      // Add current metrics from pool data
      if (poolData.tvlUsd || poolData.apy) {
        transformedPool.orca_augmentation = {
          orca_metrics: {
            apy_24h: poolData.apy || 0,
            current_liquidity: poolData.tvlUsd || 0,
            volume_24h: 0
          },
          augmented_at: new Date().toISOString()
        };
      }

      setPool(transformedPool);
    } catch (err) {
      console.error('Failed to load pool details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load pool details');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPoolDetails();
    setRefreshing(false);
  };

  const formatTVL = (tvl: number) => {
    if (tvl >= 1e9) return `$${(tvl / 1e9).toFixed(2)}B`;
    if (tvl >= 1e6) return `$${(tvl / 1e6).toFixed(2)}M`;
    if (tvl >= 1e3) return `$${(tvl / 1e3).toFixed(2)}K`;
    return `$${tvl.toFixed(2)}`;
  };

  const getQualityColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 80) return 'text-yellow-600 bg-yellow-100';
    if (score >= 60) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading pool details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !pool) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Pool</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <div className="flex gap-4">
              <button
                onClick={handleRefresh}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Retry
              </button>
              <Link
                href="/"
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentTVL = pool.orca_augmentation?.orca_metrics?.current_liquidity || 
                    pool.timeseries[pool.timeseries.length - 1]?.tvl_usd || 0;
  const currentAPY = pool.orca_augmentation?.orca_metrics?.apy_24h || 
                    pool.timeseries[pool.timeseries.length - 1]?.apy;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{pool.pool_name}</h1>
                <p className="text-gray-600">{pool.protocol} • {pool.blockchain}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Quality Score Badge */}
              <div className={`px-3 py-2 rounded-full text-sm font-medium ${getQualityColor(pool.data_quality_score)}`}>
                Quality: {pool.data_quality_score}/100
              </div>
              
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Value Locked</h3>
            <p className="text-3xl font-bold text-gray-900">{formatTVL(currentTVL)}</p>
            <p className="text-sm text-gray-500 mt-1">Current TVL</p>
          </div>
          
          {currentAPY && (
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Annual Percentage Yield</h3>
              <p className="text-3xl font-bold text-green-600">{currentAPY.toFixed(2)}%</p>
              <p className="text-sm text-gray-500 mt-1">Current APY</p>
            </div>
          )}
          
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Data Points</h3>
            <p className="text-3xl font-bold text-gray-900">{pool.data_points}</p>
            <p className="text-sm text-gray-500 mt-1">Historical records</p>
          </div>
        </div>

        {/* Chart */}
        {pool.timeseries.length > 0 && (
          <div className="mb-8">
            <PoolChart 
              data={pool.timeseries} 
              title={`${pool.pool_name} Historical Data`}
            />
          </div>
        )}

        {/* Pool Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pool Details */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pool Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Universal ID</label>
                <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded mt-1">
                  {pool.universal_id}
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Contract Address</label>
                <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded mt-1">
                  {pool.contract_address}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Protocol</label>
                  <p className="text-sm text-gray-900 mt-1">{pool.protocol}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Blockchain</label>
                  <p className="text-sm text-gray-900 mt-1 capitalize">{pool.blockchain}</p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Last Updated</label>
                <p className="text-sm text-gray-900 mt-1">
                  {format(parseISO(pool.last_updated), 'PPpp')}
                </p>
              </div>
            </div>
          </div>

          {/* Data Quality & Sources */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Quality & Sources</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium text-gray-500">Data Quality Score</label>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getQualityColor(pool.data_quality_score)}`}>
                    {pool.validation_passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${pool.data_quality_score}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-1">{pool.data_quality_score}/100</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Data Sources</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {pool.data_sources.map((source, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {source}
                    </span>
                  ))}
                </div>
              </div>
              
              {pool.composition?.explorer_links && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Explorer Links</label>
                  <div className="space-y-2 mt-1">
                    {Object.entries(pool.composition.explorer_links).map(([name, url]) => (
                      <a
                        key={name}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View on {name.charAt(0).toUpperCase() + name.slice(1)}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}