/**
 * Pool Analytics Page - Complete Time Series Auditing
 * Shows every data point with detailed breakdown for data auditing
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { defiLlamaAPI } from '@/lib/defi-api';
import { PoolTimeseriesPoint } from '@/types/pool';

interface PoolDetails {
  pool: string;
  project: string;
  symbol: string;
  chain: string;
  tvlUsd: number;
  apy: number;
  apyBase?: number;
  apyReward?: number;
  count7d?: number;
  volumeUsd1d?: number;
  volumeUsd7d?: number;
  feesUsd1d?: number;
  feesUsd7d?: number;
  il7d?: number;
  apyMean30d?: number;
  stablecoin?: boolean;
  exposure?: string;
  outlier?: boolean;
  poolMeta?: string;
  mu?: number;
  sigma?: number;
  predictions?: any;
}

export default function PoolAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const poolId = params.poolId as string;
  
  const [poolDetails, setPoolDetails] = useState<PoolDetails | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<PoolTimeseriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'tvlUsd' | 'apy' | 'volumeUsd1d' | 'feesUsd1d'>('tvlUsd');
  const [dateRange, setDateRange] = useState<'30d' | '90d' | '365d' | 'all'>('all');
  const [searchDate, setSearchDate] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPoolData();
  }, [poolId, dateRange]);

  const loadPoolData = async () => {
    if (!poolId) return;
    
    try {
      setLoading(true);
      setError(null);

      // Get pool details from the pools list
      const poolsResponse = await defiLlamaAPI.getHighTVLPools();
      const pool = poolsResponse.data?.find((p: any) => p.pool === poolId);
      
      if (!pool) {
        setError('Pool not found');
        return;
      }
      
      setPoolDetails(pool);

      // Get historical time series data
      const days = dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : dateRange === '365d' ? 365 : 1825;
      const timeSeriesResponse = await defiLlamaAPI.getPoolTimeSeries(poolId, days);
      
      if (timeSeriesResponse.error) {
        setError(timeSeriesResponse.error);
        return;
      }

      setTimeSeriesData(timeSeriesResponse.data || []);
    } catch (err) {
      console.error('Failed to load pool data:', err);
      setError('Failed to load pool data');
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: any, metric: string): string => {
    if (value === null || value === undefined || isNaN(value)) return '-';
    
    switch (metric) {
      case 'tvlUsd':
      case 'volumeUsd1d':
      case 'feesUsd1d':
        if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
        if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
        if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
        return `$${value.toFixed(2)}`;
      case 'apy':
      case 'apyBase':
      case 'apyReward':
        return `${value.toFixed(2)}%`;
      default:
        return value.toLocaleString();
    }
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateDetailed = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getValueForMetric = (point: PoolTimeseriesPoint, metric: string): number | null => {
    switch (metric) {
      case 'tvlUsd': return point.tvlUsd || null;
      case 'apy': return point.apy || null;
      case 'volumeUsd1d': return point.volumeUsd1d || null;
      case 'feesUsd1d': return point.feesUsd1d || null;
      default: return null;
    }
  };

  // Calculate data completeness metrics for auditing
  const calculateDataCompleteness = (data: PoolHistoricalPoint[]) => {
    if (data.length === 0) {
      return {
        totalDays: 0,
        expectedDays: 0,
        missingDays: 0,
        completeness: 0,
        gaps: [],
        oldestDate: null,
        newestDate: null
      };
    }

    // Sort data by date to ensure correct order
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const oldestDate = sortedData[0].date;
    const newestDate = sortedData[sortedData.length - 1].date;
    
    // Calculate expected number of days
    const oldestTime = new Date(oldestDate).getTime();
    const newestTime = new Date(newestDate).getTime();
    const expectedDays = Math.floor((newestTime - oldestTime) / (24 * 60 * 60 * 1000)) + 1;
    
    // Find gaps
    const gaps: string[] = [];
    const dateSet = new Set(sortedData.map(point => point.date));
    
    for (let i = 0; i < expectedDays; i++) {
      const currentDate = new Date(oldestTime + i * 24 * 60 * 60 * 1000);
      const dateStr = currentDate.toISOString().split('T')[0];
      if (!dateSet.has(dateStr)) {
        gaps.push(dateStr);
      }
    }
    
    const completeness = ((expectedDays - gaps.length) / expectedDays) * 100;
    
    return {
      totalDays: sortedData.length,
      expectedDays,
      missingDays: gaps.length,
      completeness: Math.round(completeness * 100) / 100,
      gaps: gaps.slice(0, 10), // Show first 10 gaps to avoid overwhelming UI
      oldestDate,
      newestDate
    };
  };

  const dataCompleteness = calculateDataCompleteness(timeSeriesData);

  const filteredData = timeSeriesData
    .filter(point => {
      if (!searchDate) return true;
      return point.date.includes(searchDate);
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort newest to oldest

  const toggleRowExpansion = (date: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedRows(newExpanded);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-800 rounded mb-4"></div>
            <div className="h-64 bg-gray-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
            <p className="text-red-400">{error}</p>
            <Link href="/pools" className="text-blue-400 hover:text-blue-300 mt-2 inline-block">
              ← Back to Pools
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/pools" className="text-blue-400 hover:text-blue-300 mb-2 inline-block">
              ← Back to Pools
            </Link>
            <h1 className="text-2xl font-bold text-white">
              Pool Analytics: {poolDetails?.symbol || poolId}
            </h1>
            <p className="text-gray-400 text-sm">
              {poolDetails?.project} • {poolDetails?.chain}
            </p>
          </div>
        </div>

        {/* Pool Summary */}
        {poolDetails && (
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Current TVL</p>
                <p className="text-white text-lg font-semibold">
                  {formatValue(poolDetails.tvlUsd, 'tvlUsd')}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">APY</p>
                <p className="text-white text-lg font-semibold">
                  {formatValue(poolDetails.apy, 'apy')}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">24h Volume</p>
                <p className="text-white text-lg font-semibold">
                  {formatValue(poolDetails.volumeUsd1d, 'volumeUsd1d')}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">24h Fees</p>
                <p className="text-white text-lg font-semibold">
                  {formatValue(poolDetails.feesUsd1d, 'feesUsd1d')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Data Completeness Metrics */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 mb-6">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            📊 Data Completeness
            <span className="text-xs text-gray-400">(for data auditing)</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Total Data Points</p>
              <p className="text-white font-semibold">{dataCompleteness.totalDays.toLocaleString()} days</p>
            </div>
            <div>
              <p className="text-gray-400">Expected Days</p>
              <p className="text-white font-semibold">{dataCompleteness.expectedDays.toLocaleString()} days</p>
            </div>
            <div>
              <p className="text-gray-400">Missing Days</p>
              <p className={`font-semibold ${dataCompleteness.missingDays === 0 ? 'text-green-400' : 'text-red-400'}`}>
                {dataCompleteness.missingDays.toLocaleString()} days
              </p>
            </div>
            <div>
              <p className="text-gray-400">Completeness</p>
              <p className={`font-semibold ${dataCompleteness.completeness >= 99 ? 'text-green-400' : dataCompleteness.completeness >= 95 ? 'text-yellow-400' : 'text-red-400'}`}>
                {dataCompleteness.completeness}%
              </p>
            </div>
          </div>
          
          {/* Date Range Info */}
          {dataCompleteness.oldestDate && dataCompleteness.newestDate && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <p className="text-gray-400 text-xs">
                Data Range: {formatDate(dataCompleteness.oldestDate)} → {formatDate(dataCompleteness.newestDate)}
              </p>
            </div>
          )}
          
          {/* Show gaps if any exist */}
          {dataCompleteness.gaps.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <p className="text-yellow-400 text-xs font-medium mb-2">⚠️ Data Gaps Detected:</p>
              <div className="flex flex-wrap gap-1">
                {dataCompleteness.gaps.map((gap, index) => (
                  <span key={gap} className="bg-red-900/30 text-red-300 px-2 py-1 rounded text-xs font-mono">
                    {formatDate(gap)}
                  </span>
                ))}
                {dataCompleteness.missingDays > dataCompleteness.gaps.length && (
                  <span className="text-gray-500 text-xs">
                    +{dataCompleteness.missingDays - dataCompleteness.gaps.length} more...
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Date Range Selector */}
            <div>
              <label className="text-gray-300 text-sm mr-2">Time Range:</label>
              <select 
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="bg-gray-800 text-white px-3 py-1 rounded border border-gray-700 text-sm"
              >
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="365d">Last Year</option>
                <option value="all">All Time</option>
              </select>
            </div>

            {/* Metric Selector */}
            <div>
              <label className="text-gray-300 text-sm mr-2">Primary Metric:</label>
              <select 
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value as any)}
                className="bg-gray-800 text-white px-3 py-1 rounded border border-gray-700 text-sm"
              >
                <option value="tvlUsd">TVL (USD)</option>
                <option value="apy">APY (%)</option>
                <option value="volumeUsd1d">24h Volume</option>
                <option value="feesUsd1d">24h Fees</option>
              </select>
            </div>

            {/* Date Search */}
            <div>
              <label className="text-gray-300 text-sm mr-2">Search Date:</label>
              <input 
                type="text"
                placeholder="YYYY-MM-DD"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="bg-gray-800 text-white px-3 py-1 rounded border border-gray-700 text-sm w-32"
              />
            </div>

            <div className="text-gray-400 text-sm">
              {filteredData.length} data points
            </div>
          </div>
        </div>

        {/* Time Series Data Table */}
        <div className="bg-gray-900 rounded-lg border border-gray-800">
          <div className="p-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white">
              Complete Time Series Data - {selectedMetric.toUpperCase()}
            </h2>
            <p className="text-gray-400 text-sm">
              Click any row to expand and see all metrics for that date
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="text-left p-3 text-gray-300 text-sm font-medium">Date</th>
                  <th className="text-right p-3 text-gray-300 text-sm font-medium">
                    {selectedMetric === 'tvlUsd' ? 'TVL (USD)' : 
                     selectedMetric === 'apy' ? 'APY (%)' :
                     selectedMetric === 'volumeUsd1d' ? '24h Volume' : '24h Fees'}
                  </th>
                  <th className="text-right p-3 text-gray-300 text-sm font-medium">Change</th>
                  <th className="text-center p-3 text-gray-300 text-sm font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((point, index) => {
                  const value = getValueForMetric(point, selectedMetric);
                  const prevValue = index < filteredData.length - 1 ? 
                    getValueForMetric(filteredData[index + 1], selectedMetric) : null;
                  const change = value && prevValue ? ((value - prevValue) / prevValue * 100) : null;
                  const isExpanded = expandedRows.has(point.date);

                  return (
                    <React.Fragment key={point.date}>
                      <tr 
                        className="border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer"
                        onClick={() => toggleRowExpansion(point.date)}
                      >
                        <td className="p-3 text-white font-mono text-sm">
                          {formatDate(point.date)}
                        </td>
                        <td className="p-3 text-white text-sm text-right font-medium">
                          {formatValue(value, selectedMetric)}
                        </td>
                        <td className={`p-3 text-sm text-right font-medium ${
                          change === null ? 'text-gray-500' :
                          change > 0 ? 'text-green-400' : 
                          change < 0 ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {change === null ? '-' : 
                           change > 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`}
                        </td>
                        <td className="p-3 text-center">
                          <button className="text-blue-400 hover:text-blue-300 text-sm">
                            {isExpanded ? '▲' : '▼'}
                          </button>
                        </td>
                      </tr>
                      
                      {isExpanded && (
                        <tr className="bg-gray-800/30">
                          <td colSpan={4} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              <div className="bg-gray-800 rounded p-3">
                                <p className="text-gray-400 text-xs uppercase tracking-wide">Date Details</p>
                                <p className="text-white text-sm font-medium">{formatDateDetailed(point.date)}</p>
                                <p className="text-gray-400 text-xs mt-1">Timestamp: {point.timestamp}</p>
                              </div>
                              
                              <div className="bg-gray-800 rounded p-3">
                                <p className="text-gray-400 text-xs uppercase tracking-wide">TVL</p>
                                <p className="text-white text-sm font-medium">
                                  {formatValue(point.tvlUsd, 'tvlUsd')}
                                </p>
                                <p className="text-gray-400 text-xs">Total Value Locked</p>
                              </div>
                              
                              <div className="bg-gray-800 rounded p-3">
                                <p className="text-gray-400 text-xs uppercase tracking-wide">APY</p>
                                <p className="text-white text-sm font-medium">
                                  {formatValue(point.apy, 'apy')}
                                </p>
                                <div className="text-xs text-gray-400 mt-1">
                                  <div>Base: {formatValue(point.apyBase, 'apy')}</div>
                                  <div>Reward: {formatValue(point.apyReward, 'apy')}</div>
                                </div>
                              </div>
                              
                              <div className="bg-gray-800 rounded p-3">
                                <p className="text-gray-400 text-xs uppercase tracking-wide">24h Activity</p>
                                <div className="text-white text-sm">
                                  <div>Vol: {formatValue(point.volumeUsd1d, 'volumeUsd1d')}</div>
                                  <div>Fees: {formatValue(point.feesUsd1d, 'feesUsd1d')}</div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Raw Data Section for Debugging */}
                            <details className="mt-4">
                              <summary className="text-gray-400 text-xs cursor-pointer hover:text-gray-300">
                                🔍 Raw Data (for debugging)
                              </summary>
                              <pre className="bg-black rounded p-2 mt-2 text-xs text-gray-300 overflow-x-auto">
                                {JSON.stringify(point, null, 2)}
                              </pre>
                            </details>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredData.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              No data points found for the selected criteria
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPoolData();
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
              poolId={pool.contract_address}
              chain={pool.blockchain}
              chartType="tvl"
              title={`${pool.pool_name} TVL History`}
              color="#3B82F6"
              days={30}
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