/**
 * Homepage - Pool Registry Dashboard
 * Displays overview of all available liquidity pools with quality indicators
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PoolCard from '@/components/PoolCard';
import { defiLlamaAPI } from '@/lib/defi-api';
import { testDefiLlamaAPI, testWithMockData } from '@/lib/debug-api';
import { PoolData } from '@/types/pool';

interface PoolStats {
  totalPools: number;
  totalTVL: number;
  averageQuality: number;
  activeChains: string[];
}

export default function HomePage() {
  const [pools, setPools] = useState<{ [key: string]: PoolData }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChain, setSelectedChain] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'tvl' | 'quality' | 'name'>('tvl');
  const [stats, setStats] = useState<PoolStats>({
    totalPools: 0,
    totalTVL: 0,
    averageQuality: 0,
    activeChains: []
  });

  useEffect(() => {
    loadPoolData();
  }, []);

  const loadPoolData = async () => {
    try {
      setLoading(true);
      console.log('🚀 Starting data load...');
      
      // For debugging, let's skip API entirely and use mock data
      console.log('🔧 Using mock data for debugging...');
      const response = await testWithMockData();
      
      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.data || response.data.length === 0) {
        throw new Error('No pool data available');
      }

      // Transform DefiLlama data to our format
      const transformedPools: { [key: string]: PoolData } = {};
      let totalTVL = 0;
      let totalQuality = 0;
      const chains = new Set<string>();

      // Process each pool from DefiLlama
      for (const pool of response.data.slice(0, 50)) { // Limit to first 50 pools for demo
        try {
          // Create universal ID from chain and pool identifier
          const blockchain = pool.chain?.toLowerCase() || 'unknown';
          const contractAddress = pool.pool || (pool as any).poolMeta?.poolId || `pool-${pool.pool}`;
          const universalId = `${blockchain}:${contractAddress}`;

          // Get historical data
          const historicalResponse = await defiLlamaAPI.getPoolHistoricalData(pool.pool);
          const timeseries = historicalResponse.data || [];

          // Create pool data object
          const poolData: PoolData = {
            universal_id: universalId,
            contract_address: contractAddress,
            blockchain: blockchain as any,
            pool_name: pool.symbol || 'Unknown Pool',
            protocol: pool.project || 'Unknown',
            timeseries: timeseries,
            data_points: timeseries.length,
            data_quality_score: 0,
            validation_passed: false,
            data_sources: ['defillama'],
            last_updated: new Date().toISOString(),
            created_at: new Date().toISOString()
          };

          // Validate data quality
          const validation = defiLlamaAPI.validatePoolData(poolData);
          poolData.data_quality_score = validation.score;
          poolData.validation_passed = validation.passed;

          // Only include pools that pass validation
          if (validation.passed) {
            transformedPools[universalId] = poolData;
            
            // Update statistics
            const currentTVL = pool.tvlUsd || 0;
            totalTVL += currentTVL;
            totalQuality += validation.score;
            chains.add(blockchain);
          }
        } catch (poolError) {
          console.warn(`Failed to process pool ${pool.pool}:`, poolError);
        }
      }

      setPools(transformedPools);
      
      const poolCount = Object.keys(transformedPools).length;
      setStats({
        totalPools: poolCount,
        totalTVL: totalTVL,
        averageQuality: poolCount > 0 ? totalQuality / poolCount : 0,
        activeChains: Array.from(chains)
      });

      setError(null);
    } catch (err) {
      console.error('Failed to load pool data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load pool data');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort pools
  const filteredPools = Object.entries(pools)
    .filter(([_, pool]) => {
      const matchesSearch = pool.pool_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          pool.protocol.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesChain = selectedChain === 'all' || pool.blockchain === selectedChain;
      return matchesSearch && matchesChain;
    })
    .sort(([_a, poolA], [_b, poolB]) => {
      switch (sortBy) {
        case 'tvl':
          const tvlA = poolA.orca_augmentation?.orca_metrics?.current_liquidity || 
                      poolA.timeseries[poolA.timeseries.length - 1]?.tvl_usd || 0;
          const tvlB = poolB.orca_augmentation?.orca_metrics?.current_liquidity || 
                      poolB.timeseries[poolB.timeseries.length - 1]?.tvl_usd || 0;
          return tvlB - tvlA;
        case 'quality':
          return poolB.data_quality_score - poolA.data_quality_score;
        case 'name':
          return poolA.pool_name.localeCompare(poolB.pool_name);
        default:
          return 0;
      }
    });

  const formatTVL = (tvl: number) => {
    if (tvl >= 1e9) return `$${(tvl / 1e9).toFixed(2)}B`;
    if (tvl >= 1e6) return `$${(tvl / 1e6).toFixed(2)}M`;
    if (tvl >= 1e3) return `$${(tvl / 1e3).toFixed(2)}K`;
    return `$${tvl.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading pool data from DefiLlama...</p>
              <p className="text-sm text-gray-500 mt-2">This may take a moment due to rate limiting</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadPoolData}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                DeFi Liquidity Pool Dashboard
              </h1>
              <p className="text-gray-600 mt-2">
                Historical analysis of yield farming opportunities across multiple chains
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Powered by</p>
              <p className="text-lg font-semibold text-blue-600">DefiLlama API</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Pools</h3>
            <p className="text-2xl font-bold text-gray-900">{stats.totalPools}</p>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total TVL</h3>
            <p className="text-2xl font-bold text-gray-900">{formatTVL(stats.totalTVL)}</p>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Avg. Quality Score</h3>
            <p className="text-2xl font-bold text-gray-900">{stats.averageQuality.toFixed(1)}/100</p>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Active Chains</h3>
            <p className="text-2xl font-bold text-gray-900">{stats.activeChains.length}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg p-6 mb-8 border border-gray-200">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <input
                type="text"
                placeholder="Search pools or protocols..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <select
              value={selectedChain}
              onChange={(e) => setSelectedChain(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Chains</option>
              {stats.activeChains.map(chain => (
                <option key={chain} value={chain}>
                  {chain.charAt(0).toUpperCase() + chain.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="tvl">Sort by TVL</option>
              <option value="quality">Sort by Quality</option>
              <option value="name">Sort by Name</option>
            </select>

            <button
              onClick={loadPoolData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Pool Grid */}
        {filteredPools.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No pools match your current filters</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedChain('all');
              }}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPools.map(([contractKey, pool]) => (
              <PoolCard
                key={contractKey}
                pool={pool}
                contractKey={contractKey}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
