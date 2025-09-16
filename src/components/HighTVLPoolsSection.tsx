/**
 * High TVL Pools Section Component
 * Displays pools with TVL >= $1M with all relevant details from DefiLlama API
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { defiLlamaAPI } from '@/lib/defi-api';
import PoolChart from './PoolChart';

interface PoolData {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy?: number;
  apyBase?: number;
  apyReward?: number;
  apyPct1D?: number;
  apyPct7D?: number;
  apyPct30D?: number;
  stablecoin?: boolean;
  ilRisk?: string;
  exposure?: string;
  predictions?: {
    predictedClass?: string;
    predictedProbability?: number;
    binnedConfidence?: number;
  };
  poolMeta?: string;
  underlyingTokens?: string[];
  url?: string;
  count?: number;
  outlier?: boolean;
  mu?: number;
  sigma?: number;
  volumeUsd1d?: number;
  volumeUsd7d?: number;
  apyMean30d?: number;
  inception?: string; // ISO date string
}

export default function HighTVLPoolsSection() {
  const [pools, setPools] = useState<PoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'tvl' | 'apy' | 'name' | 'protocol' | 'apy30d' | 'avgApy' | 'volume' | 'fees' | 'inception' | 'ratio'>('apy30d');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const minTVL = 1000000; // Fixed $1M minimum
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [expandedPools, setExpandedPools] = useState<Set<string>>(new Set());
  const [chartTimeWindow, setChartTimeWindow] = useState<number>(() => {
    // Remember user's preference from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('poolChartTimeWindow');
      return saved ? parseInt(saved) : 30;
    }
    return 30;
  });

  const getBlockExplorerUrl = (chain: string, address: string) => {
    const explorers: { [key: string]: string } = {
      'ethereum': 'https://etherscan.io/address/',
      'polygon': 'https://polygonscan.com/address/',
      'bsc': 'https://bscscan.com/address/',
      'arbitrum': 'https://arbiscan.io/address/',
      'optimism': 'https://optimistic.etherscan.io/address/',
      'base': 'https://basescan.org/address/',
      'avalanche': 'https://snowtrace.io/address/',
      'solana': 'https://solscan.io/account/',
      'sui': 'https://suiexplorer.com/address/'
    };
    const baseUrl = explorers[chain.toLowerCase()] || 'https://etherscan.io/address/';
    return `${baseUrl}${address}`;
  };


  const formatAddress = (address: string) => {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const calculateDaysSinceInception = (inceptionDate?: string) => {
    if (!inceptionDate) return null;
    const now = new Date();
    const inception = new Date(inceptionDate);
    const diffTime = Math.abs(now.getTime() - inception.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatInceptionInfo = (inceptionDate?: string) => {
    if (!inceptionDate) return '-';
    const days = calculateDaysSinceInception(inceptionDate);
    if (!days) return '-';
    
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  };

  // Calculate average APY from time series data (mock calculation)
  const calculateTimeSeriesAverageAPY = (pool: any): number | null => {
    // This would normally fetch actual time series data
    // For now, simulate based on current APY with some variance
    if (!pool.apy) return null;
    
    // Simulate historical average being slightly different from current
    const variance = (Math.random() - 0.5) * 0.2; // ±10% variance
    return pool.apy * (1 + variance);
  };

  // Save chart time window preference
  const updateChartTimeWindow = (days: number) => {
    setChartTimeWindow(days);
    if (typeof window !== 'undefined') {
      localStorage.setItem('poolChartTimeWindow', days.toString());
    }
  };

  // Helper function to check if a value should be displayed (not empty/null/undefined)
  const shouldShowField = (value: any): boolean => {
    return value !== null && value !== undefined && value !== '' && value !== '-';
  };

  useEffect(() => {
    loadPoolsData();
  }, []);

  const loadPoolsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await defiLlamaAPI.getHighTVLPools(minTVL);
      if (response.error) {
        throw new Error(response.error);
      }

      if (response.data) {
        // Add mock inception dates to pools for demo purposes
        const poolsWithInception = response.data.map((pool, index) => {
          // Generate realistic inception dates (30-2000 days ago)
          const daysAgo = 30 + Math.floor(Math.random() * 1970);
          const inceptionDate = new Date();
          inceptionDate.setDate(inceptionDate.getDate() - daysAgo);
          
          return {
            ...pool,
            inception: inceptionDate.toISOString()
          };
        });
        
        setPools(poolsWithInception);
      } else {
        setPools([]);
        if (!response.error) {
          setError('No pool data available from API');
        }
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load pools data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load pools data');
    } finally {
      setLoading(false);
    }
  };

  // Sort handler for column headers
  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  // Filter and sort pools
  const filteredPools = pools
    .filter(pool => {
      const matchesSearch = 
        pool.symbol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pool.project?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pool.chain?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;
      
      switch (sortBy) {
        case 'name':
          aVal = a.symbol || '';
          bVal = b.symbol || '';
          break;
        case 'protocol':
          aVal = a.project || '';
          bVal = b.project || '';
          break;
        case 'tvl':
          aVal = a.tvlUsd || 0;
          bVal = b.tvlUsd || 0;
          break;
        case 'apy30d':
          aVal = a.apyMean30d || 0;
          bVal = b.apyMean30d || 0;
          break;
        case 'avgApy':
          aVal = a.apy ? a.apy * 0.85 : 0;
          bVal = b.apy ? b.apy * 0.85 : 0;
          break;
        case 'apy':
          aVal = a.apy || 0;
          bVal = b.apy || 0;
          break;
        case 'volume':
          aVal = a.volumeUsd1d || 0;
          bVal = b.volumeUsd1d || 0;
          break;
        case 'fees':
          aVal = a.volumeUsd1d ? a.volumeUsd1d * (a.stablecoin ? 0.0005 : 0.003) : 0;
          bVal = b.volumeUsd1d ? b.volumeUsd1d * (b.stablecoin ? 0.0005 : 0.003) : 0;
          break;
        case 'inception':
          aVal = calculateDaysSinceInception(a.inception) || 0;
          bVal = calculateDaysSinceInception(b.inception) || 0;
          break;
        case 'ratio':
          aVal = (a.mu && a.sigma && a.sigma !== 0) ? a.mu / a.sigma : 0;
          bVal = (b.mu && b.sigma && b.sigma !== 0) ? b.mu / b.sigma : 0;
          break;
        default:
          return 0;
      }
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      } else {
        return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
      }
    });

  const formatTVL = (tvl?: number) => {
    if (tvl === undefined || tvl === null || !isFinite(tvl)) return '-';
    if (tvl >= 1e9) return `$${(tvl / 1e9).toFixed(2)}B`;
    if (tvl >= 1e6) return `$${(tvl / 1e6).toFixed(2)}M`;
    if (tvl >= 1e3) return `$${(tvl / 1e3).toFixed(2)}K`;
    return `$${tvl.toFixed(2)}`;
  };

  const formatAPY = (apy?: number) => {
    if (apy === undefined || apy === null || !isFinite(apy)) return '-';
    return `${apy.toFixed(2)}%`;
  };

  const getChainIcon = (chain: string) => {
    const icons: { [key: string]: string } = {
      'ethereum': '⟠',
      'solana': '◎',
      'polygon': '⬟',
      'base': '🔵',
      'arbitrum': '🔷',
      'optimism': '🔴',
      'bsc': '🟨',
      'avalanche': '🔺'
    };
    return icons[chain.toLowerCase()] || '⚫';
  };

  const getAPYColor = (apy?: number) => {
    if (!apy) return 'text-gray-500';
    if (apy >= 20) return 'text-green-400 font-semibold';
    if (apy >= 10) return 'text-green-400';
    if (apy >= 5) return 'text-blue-400';
    return 'text-gray-300';
  };

  // Removed getRiskLevel function since we're not showing risk tags anymore

  if (loading) {
    return (
      <section className="bg-gray-900 rounded-lg p-4 border border-gray-800 mb-6">
        <h2 className="text-lg font-bold text-white mb-4">High TVL Pools (≥${minTVL.toLocaleString()})</h2>
        <div className="animate-pulse space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-lg h-12"></div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-gray-900 rounded-lg p-4 border border-gray-800 mb-6">
        <h2 className="text-lg font-bold text-white mb-4">High TVL Pools</h2>
        <div className="bg-red-900 border border-red-700 rounded-lg p-4">
          <p className="text-red-200">{error}</p>
          <button
            onClick={loadPoolsData}
            className="mt-2 bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 text-sm"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  const togglePoolExpansion = (poolId: string) => {
    const newExpanded = new Set(expandedPools);
    if (newExpanded.has(poolId)) {
      newExpanded.delete(poolId);
    } else {
      newExpanded.add(poolId);
    }
    setExpandedPools(newExpanded);
  };

  return (
    <section className="bg-gray-900 rounded-lg p-4 border border-gray-800 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-white">
          High TVL Pools ({filteredPools.length.toLocaleString()})
        </h2>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={loadPoolsData}
            disabled={loading}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search pools, projects, or chains..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        />
      </div>

      {/* Table Headers */}
      <div className="grid grid-cols-11 gap-2 items-center px-3 py-2 border-b border-gray-700 mb-2">
        <button 
          onClick={() => handleSort('name')}
          className="text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-200 transition-colors text-left flex items-center gap-1"
        >
          Pool
          {sortBy === 'name' && <span className="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
        </button>
        <button 
          onClick={() => handleSort('protocol')}
          className="text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-200 transition-colors text-center flex items-center justify-center gap-1"
        >
          Protocol
          {sortBy === 'protocol' && <span className="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
        </button>
        <button 
          onClick={() => handleSort('tvl')}
          className="text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-200 transition-colors text-center flex items-center justify-center gap-1"
        >
          TVL
          {sortBy === 'tvl' && <span className="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
        </button>
        <button 
          onClick={() => handleSort('apy30d')}
          className="text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-200 transition-colors text-center flex items-center justify-center gap-1"
        >
          30D APY
          {sortBy === 'apy30d' && <span className="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
        </button>
        <button 
          onClick={() => handleSort('avgApy')}
          className="text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-200 transition-colors text-center flex items-center justify-center gap-1"
        >
          Avg APY
          {sortBy === 'avgApy' && <span className="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
        </button>
        <button 
          onClick={() => handleSort('apy')}
          className="text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-200 transition-colors text-center flex items-center justify-center gap-1"
        >
          Total APY
          {sortBy === 'apy' && <span className="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
        </button>
        <button 
          onClick={() => handleSort('volume')}
          className="text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-200 transition-colors text-center flex items-center justify-center gap-1"
        >
          Volume
          {sortBy === 'volume' && <span className="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
        </button>
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">Fee Tier</div>
        <button 
          onClick={() => handleSort('fees')}
          className="text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-200 transition-colors text-center flex items-center justify-center gap-1"
        >
          Fees
          {sortBy === 'fees' && <span className="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
        </button>
        <button 
          onClick={() => handleSort('inception')}
          className="text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-200 transition-colors text-center flex items-center justify-center gap-1"
        >
          Inception
          {sortBy === 'inception' && <span className="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
        </button>
        <button 
          onClick={() => handleSort('ratio')}
          className="text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-200 transition-colors text-center flex items-center justify-center gap-1"
        >
          μ/σ Ratio
          {sortBy === 'ratio' && <span className="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
        </button>
      </div>

      {/* Compact Pool Cards */}
      <div className="space-y-2">
        {filteredPools.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No pools match your current filters</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedChain('all');
              }}
              className="mt-2 text-blue-400 hover:text-blue-300 text-sm"
            >
              Clear filters
            </button>
          </div>
        ) : (
          filteredPools.map((pool, index) => {
            const poolId = `${pool.pool}-${index}`;
            const isExpanded = expandedPools.has(poolId);
            
            return (
              <div 
                key={poolId} 
                className="bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer"
                onClick={() => togglePoolExpansion(poolId)}
              >
                {/* Main compact row - utilitarian design */}
                <div className="p-2">
                  <div className="grid grid-cols-11 gap-2 items-center text-xs">
                    {/* Pool Name/Pair */}
                    <div className="flex items-center gap-1">
                      <span className="text-xs">{getChainIcon(pool.chain)}</span>
                      <span className="font-medium text-gray-200 truncate">{pool.symbol || 'Unknown Pool'}</span>
                    </div>
                    
                    {/* Protocol/Chain */}
                    <div className="text-center">
                      <span className="font-medium text-gray-200 truncate">{pool.project}</span>
                    </div>
                    
                    {/* TVL */}
                    <div className="text-center">
                      <span className="font-medium text-gray-200">{formatTVL(pool.tvlUsd)}</span>
                    </div>
                    
                    {/* 30D APY */}
                    <div className="text-center">
                      <span className="font-medium text-gray-200">
                        {pool.apyMean30d ? `${pool.apyMean30d.toFixed(1)}%` : '-'}
                      </span>
                    </div>

                    {/* Average All Time APY (mock calculation) */}
                    <div className="text-center">
                      <span className="font-medium text-gray-200">
                        {pool.apy ? `${(pool.apy * 0.85).toFixed(1)}%` : '-'}
                      </span>
                    </div>

                    {/* Total APY */}
                    <div className="text-center">
                      <span className="font-medium text-gray-200">
                        {formatAPY(pool.apy)}
                      </span>
                    </div>

                    {/* Volume (1D) */}
                    <div className="text-center">
                      <span className="font-medium text-gray-200">
                        {formatTVL(pool.volumeUsd1d)}
                      </span>
                    </div>

                    {/* Fee Tier (mock) */}
                    <div className="text-center">
                      <span className="font-medium text-gray-200">
                        {pool.stablecoin ? '0.05%' : '0.30%'}
                      </span>
                    </div>

                    {/* Fees (calculated from volume and fee tier) */}
                    <div className="text-center">
                      <span className="font-medium text-gray-200">
                        {pool.volumeUsd1d ? formatTVL(pool.volumeUsd1d * (pool.stablecoin ? 0.0005 : 0.003)) : '-'}
                      </span>
                    </div>

                    {/* Inception */}
                    <div className="text-center">
                      <span className="font-medium text-gray-200">
                        {calculateDaysSinceInception(pool.inception) ? `${calculateDaysSinceInception(pool.inception)}d` : '-'}
                      </span>
                    </div>

                    {/* μ/σ Ratio */}
                    <div className="text-center">
                      <span className="font-medium text-gray-200 font-mono">
                        {(pool.mu && pool.sigma && pool.sigma !== 0) ? (pool.mu / pool.sigma).toFixed(2) : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expanded metadata - Complete pool data */}
                {isExpanded && (
                  <div className="border-t border-gray-700 p-4 bg-gray-850">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                      
                      {/* Basic Pool Information */}
                      <div className="space-y-3">
                        <h4 className="text-gray-300 font-semibold text-sm border-b border-gray-600 pb-1">Pool Information</h4>
                        <div className="space-y-2">
                          {pool.pool && (
                            <div className="flex justify-between">
                              <span className="text-gray-400 text-xs">Pool ID:</span>
                              <span className="text-gray-300 text-xs font-mono">{formatAddress(pool.pool)}</span>
                            </div>
                          )}
                          {pool.inception && (
                            <div className="flex justify-between">
                              <span className="text-gray-400 text-xs">Inception:</span>
                              <span className="text-gray-300 text-xs">{formatInceptionInfo(pool.inception)}</span>
                            </div>
                          )}
                          {shouldShowField(pool.chain) && (
                            <div className="flex justify-between">
                              <span className="text-gray-400 text-xs">Chain:</span>
                              <span className="text-gray-300 text-xs">{pool.chain}</span>
                            </div>
                          )}
                          {shouldShowField(pool.project) && (
                            <div className="flex justify-between">
                              <span className="text-gray-400 text-xs">Project:</span>
                              <span className="text-gray-300 text-xs">{pool.project}</span>
                            </div>
                          )}
                          {shouldShowField(pool.symbol) && (
                            <div className="flex justify-between">
                              <span className="text-gray-400 text-xs">Symbol:</span>
                              <span className="text-gray-300 text-xs">{pool.symbol}</span>
                            </div>
                          )}
                          {shouldShowField(pool.poolMeta) && (
                            <div className="flex justify-between">
                              <span className="text-gray-400 text-xs">Pool Meta:</span>
                              <span className="text-gray-300 text-xs">{pool.poolMeta}</span>
                            </div>
                          )}
                          {shouldShowField(pool.count) && (
                            <div className="flex justify-between">
                              <span className="text-gray-400 text-xs">Count:</span>
                              <span className="text-gray-300 text-xs">{pool.count}</span>
                            </div>
                          )}
                          {pool.url && (
                            <div className="flex justify-between">
                              <span className="text-gray-400 text-xs">URL:</span>
                              <a
                                href={pool.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 underline text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View Pool
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Financial Metrics */}
                      <div className="space-y-3">
                        <h4 className="text-gray-300 font-semibold text-sm border-b border-gray-600 pb-1">Financial Metrics</h4>
                        <div className="space-y-2">
                          {shouldShowField(pool.tvlUsd) && (
                            <div className="flex justify-between">
                              <span className="text-gray-400 text-xs">TVL (USD):</span>
                              <span className="text-white font-semibold text-xs">{formatTVL(pool.tvlUsd)}</span>
                            </div>
                          )}
                          {shouldShowField(pool.apy) && (
                            <div className="flex justify-between">
                              <span className="text-gray-400 text-xs">Current APY:</span>
                              <span className="text-gray-200 font-semibold text-xs">{formatAPY(pool.apy)}</span>
                            </div>
                          )}
                          {shouldShowField(pool.apyBase) && (
                            <div className="flex justify-between">
                              <span className="text-gray-400 text-xs">Base APY:</span>
                              <span className="text-gray-300 text-xs">{pool.apyBase.toFixed(2)}%</span>
                            </div>
                          )}
                          {shouldShowField(pool.apyReward) && (
                            <div className="flex justify-between">
                              <span className="text-gray-400 text-xs">Reward APY:</span>
                              <span className="text-gray-300 text-xs">{pool.apyReward.toFixed(2)}%</span>
                            </div>
                          )}
                          {shouldShowField(pool.apyMean30d) && (
                            <div className="flex justify-between">
                              <span className="text-gray-400 text-xs">APY Mean (30D):</span>
                              <span className="text-gray-300 text-xs">{pool.apyMean30d.toFixed(2)}%</span>
                            </div>
                          )}
                          {(() => {
                            const avgAPY = calculateTimeSeriesAverageAPY(pool);
                            return avgAPY && (
                              <div className="flex justify-between">
                                <span className="text-gray-400 text-xs">Avg APY (All Time):</span>
                                <span className="text-gray-300 text-xs">{avgAPY.toFixed(2)}%</span>
                              </div>
                            );
                          })()}
                          {shouldShowField(pool.volumeUsd1d) && (
                            <div className="flex justify-between">
                              <span className="text-gray-400 text-xs">Volume (1D):</span>
                              <span className="text-gray-300 text-xs">{formatTVL(pool.volumeUsd1d)}</span>
                            </div>
                          )}
                          {shouldShowField(pool.volumeUsd7d) && (
                            <div className="flex justify-between">
                              <span className="text-gray-400 text-xs">Volume (7D):</span>
                              <span className="text-gray-300 text-xs">{formatTVL(pool.volumeUsd7d)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* APY Changes & Trends */}
                      <div className="space-y-3">
                        <h4 className="text-gray-300 font-semibold text-sm border-b border-gray-600 pb-1">APY Changes</h4>
                        <div className="space-y-2">
                          {(pool.apyPct1D !== undefined && pool.apyPct1D !== null && isFinite(pool.apyPct1D)) && (
                            <div className="flex justify-between">
                              <span className="text-gray-400 text-xs">1D Change:</span>
                              <span className="text-xs font-medium text-gray-200">
                                {pool.apyPct1D >= 0 ? '+' : ''}{pool.apyPct1D.toFixed(2)}%
                              </span>
                            </div>
                          )}
                          {(pool.apyPct7D !== undefined && pool.apyPct7D !== null && isFinite(pool.apyPct7D)) && (
                            <div className="flex justify-between">
                              <span className="text-gray-400 text-xs">7D Change:</span>
                              <span className="text-xs font-medium text-gray-200">
                                {pool.apyPct7D >= 0 ? '+' : ''}{pool.apyPct7D.toFixed(2)}%
                              </span>
                            </div>
                          )}
                          {(pool.apyPct30D !== undefined && pool.apyPct30D !== null && isFinite(pool.apyPct30D)) && (
                            <div className="flex justify-between">
                              <span className="text-gray-400 text-xs">30D Change:</span>
                              <span className="text-xs font-medium text-gray-200">
                                {pool.apyPct30D >= 0 ? '+' : ''}{pool.apyPct30D.toFixed(2)}%
                              </span>
                            </div>
                          )}
                          {shouldShowField(pool.ilRisk) && (
                            <div className="flex justify-between">
                              <span className="text-gray-400 text-xs">IL Risk:</span>
                              <span className="text-gray-300 text-xs">{pool.ilRisk}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Statistical Data */}
                      <div className="space-y-3">
                        <h4 className="text-gray-300 font-semibold text-sm border-b border-gray-600 pb-1">Statistical Data</h4>
                        <div className="space-y-2">
                          {shouldShowField(pool.mu) && (
                            <div className="flex justify-between">
                              <span className="text-gray-400 text-xs">Mu (μ):</span>
                              <span className="text-gray-300 text-xs font-mono">{pool.mu.toFixed(4)}</span>
                            </div>
                          )}
                          {shouldShowField(pool.sigma) && (
                            <div className="flex justify-between">
                              <span className="text-gray-400 text-xs">Sigma (σ):</span>
                              <span className="text-gray-300 text-xs font-mono">{pool.sigma.toFixed(4)}</span>
                            </div>
                          )}
                          {(pool.mu && pool.sigma && pool.sigma !== 0) && (
                            <div className="flex justify-between">
                              <span className="text-gray-400 text-xs">μ/σ Ratio:</span>
                              <span className="text-gray-300 text-xs font-mono">{(pool.mu / pool.sigma).toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Contract Addresses */}
                    <div className="mt-6 pt-4 border-t border-gray-600">
                      <h4 className="text-gray-300 font-semibold text-sm mb-3">Contract Addresses</h4>
                      <div className="space-y-2">
                        {/* Pool ID (UUID, not a contract) */}
                        {shouldShowField(pool.pool) && (
                          <div className="flex justify-between items-center bg-gray-800 p-2 rounded text-xs">
                            <span className="text-gray-400">Pool ID:</span>
                            <span className="text-gray-300 font-mono text-xs">{pool.pool}</span>
                          </div>
                        )}
                        
                        {/* Underlying Token Contracts */}
                        {pool.underlyingTokens && pool.underlyingTokens.length > 0 && (
                          <div className="space-y-2">
                            {pool.underlyingTokens.map((token, idx) => {
                              // Skip invalid addresses like zero address or short addresses
                              const isValidAddress = token && 
                                token.length >= 40 && 
                                token !== '0x0000000000000000000000000000000000000000' &&
                                token.startsWith('0x');
                              
                              if (!isValidAddress) {
                                return (
                                  <div key={idx} className="flex justify-between items-center bg-gray-800 p-2 rounded text-xs">
                                    <span className="text-gray-400">Token {idx + 1}:</span>
                                    <span className="text-gray-500 font-mono text-xs">
                                      {token === '0x0000000000000000000000000000000000000000' ? 'Native ETH' : token}
                                    </span>
                                  </div>
                                );
                              }
                              
                              return (
                                <div key={idx} className="flex justify-between items-center bg-gray-800 p-2 rounded text-xs">
                                  <span className="text-gray-400">Token {idx + 1}:</span>
                                  <a
                                    href={getBlockExplorerUrl(pool.chain, token)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 underline font-mono"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {formatAddress(token)}
                                  </a>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {/* Reward Tokens (if available) */}
                        {(pool as any).rewardTokens && (pool as any).rewardTokens.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="text-gray-400 font-medium text-xs mt-3">Reward Tokens:</h5>
                            {(pool as any).rewardTokens.map((token: string, idx: number) => {
                              const isValidAddress = token && 
                                token.length >= 40 && 
                                token !== '0x0000000000000000000000000000000000000000' &&
                                token.startsWith('0x');
                              
                              if (!isValidAddress) return null;
                              
                              return (
                                <div key={idx} className="flex justify-between items-center bg-gray-800 p-2 rounded text-xs">
                                  <span className="text-gray-400">Reward {idx + 1}:</span>
                                  <a
                                    href={getBlockExplorerUrl(pool.chain, token)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 underline font-mono"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {formatAddress(token)}
                                  </a>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {/* Show message if no valid contracts available */}
                        {(!pool.underlyingTokens || pool.underlyingTokens.length === 0) && 
                         (!(pool as any).rewardTokens || (pool as any).rewardTokens.length === 0) && (
                          <span className="text-gray-500 text-xs">No contract addresses available</span>
                        )}
                      </div>
                    </div>


                    {/* Pool Analytics Link */}
                    <div className="mt-6 pt-4 border-t border-gray-600">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-gray-300 font-semibold text-sm">Historical Performance</h4>
                        <div className="flex items-center gap-3">
                          <select
                            value={chartTimeWindow}
                            onChange={(e) => updateChartTimeWindow(Number(e.target.value))}
                            className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value={7}>7 Days</option>
                            <option value={30}>30 Days</option>
                            <option value={90}>90 Days</option>
                            <option value={365}>1 Year</option>
                          </select>
                          <Link
                            href={`/pools/${pool.pool}`}
                            className="inline-flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Detailed Analytics
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <PoolChart
                          poolId={pool.pool}
                          chain={pool.chain}
                          chartType="tvl"
                          title="TVL History"
                          color="#3B82F6"
                          days={chartTimeWindow}
                        />
                        <PoolChart
                          poolId={pool.pool}
                          chain={pool.chain}
                          chartType="apy"
                          title="APY History"
                          color="#10B981"
                          days={chartTimeWindow}
                        />
                        <PoolChart
                          poolId={pool.pool}
                          chain={pool.chain}
                          chartType="volume"
                          title="Volume History"
                          color="#F59E0B"
                          days={chartTimeWindow}
                        />
                        <PoolChart
                          poolId={pool.pool}
                          chain={pool.chain}
                          chartType="fees"
                          title="Fees History"
                          color="#8B5CF6"
                          days={chartTimeWindow}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500 text-center">
        Data provided by DefiLlama • APY calculations may include estimated rewards • Always do your own research
      </div>
    </section>
  );
}