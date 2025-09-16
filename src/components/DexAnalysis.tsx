/**
 * DEX Analysis Component
 * Focuses on DEX protocols with volume, fees, revenue comparison
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';
import { formatNumber, formatChange, CHART_COLORS, commonChartConfig } from '@/lib/utils';
import { LoadingCard, ErrorCard, ExpandButton, RawDataViewer } from '@/components/common';

interface DexProtocol {
  id: string;
  name: string;
  displayName: string;
  logo: string;
  total24h: number;
  total48hto24h: number;
  total7d: number;
  total14dto7d: number;
  total30d: number;
  total60dto30d: number;
  total1y: number;
  totalAllTime: number;
  average1y: number;
  monthlyAverage1y: number;
  change_1d: number;
  change_7d: number;
  change_1m: number;
  change_7dover7d: number;
  change_30dover30d: number;
  total7DaysAgo: number;
  total30DaysAgo: number;
  chains: string[];
  breakdown24h: Record<string, Record<string, number>>;
  breakdown30d: Record<string, Record<string, number>>;
  defillamaId: string;
  module: string;
  category: string;
  protocolType: string;
  methodologyURL?: string;
  methodology?: {
    UserFees?: string;
    Fees?: string;
    Revenue?: string;
    ProtocolRevenue?: string;
    HoldersRevenue?: string;
    SupplySideRevenue?: string;
  };
  parentProtocol?: string;
  slug?: string;
  linkedProtocols?: string[];
}

interface DexOverview {
  protocols: DexProtocol[];
}

interface DexHistoricalData {
  totalDataChart: [number, number][];
  totalDataChartBreakdown: Record<string, [number, number][]>;
  feesDataChart: [number, number][];
  feesDataChartBreakdown: Record<string, [number, number][]>;
  tvlDataChart: [number, number][];
  name: string;
  displayName: string;
  logo: string;
  slug: string;
  chains: string[];
}


export default function DexAnalysis() {
  const [data, setData] = useState<DexOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'24h' | '7d' | '30d'>('24h');
  const [sortBy, setSortBy] = useState<'volume' | 'change'>('volume');
  const [expandedProtocols, setExpandedProtocols] = useState<Set<string>>(new Set());
  const [historicalData, setHistoricalData] = useState<Map<string, DexHistoricalData>>(new Map());
  const [loadingHistory, setLoadingHistory] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchDexData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/proxy/dexs');
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
        const dexData: DexOverview = await response.json();
        
        // Filter and sort DEX protocols by volume
        const topDexs = dexData.protocols
          .filter(protocol => protocol.total24h > 0)
          .sort((a, b) => b.total24h - a.total24h)
          .slice(0, 20);

        setData({ protocols: topDexs });
      } catch (err) {
        console.error('Error fetching DEX data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchDexData();
  }, []);

  if (loading) {
    return <LoadingCard title="🔄 DEX Protocol Analysis" />;
  }

  if (error || !data) {
    return <ErrorCard title="🔄 DEX Protocol Analysis" error={error || 'Unknown error'} />;
  }

  const getVolumeForPeriod = (protocol: DexProtocol, period: string) => {
    switch (period) {
      case '24h': return protocol.total24h;
      case '7d': return protocol.total7d;
      case '30d': return protocol.total30d;
      default: return protocol.total24h;
    }
  };

  const getChangeForPeriod = (protocol: DexProtocol, period: string) => {
    switch (period) {
      case '24h': return protocol.change_1d;
      case '7d': return protocol.change_7d;
      case '30d': return protocol.change_1m;
      default: return protocol.change_1d;
    }
  };

  const sortedProtocols = [...data.protocols].sort((a, b) => {
    if (sortBy === 'volume') {
      return getVolumeForPeriod(b, selectedPeriod) - getVolumeForPeriod(a, selectedPeriod);
    } else {
      const changeA = getChangeForPeriod(a, selectedPeriod) || 0;
      const changeB = getChangeForPeriod(b, selectedPeriod) || 0;
      return changeB - changeA;
    }
  });

  // Memoize expensive calculations
  const { chartData, pieData, totalVolume } = useMemo(() => {
    const total = sortedProtocols.reduce((sum, protocol) => sum + getVolumeForPeriod(protocol, selectedPeriod), 0);
    
    return {
      chartData: sortedProtocols.slice(0, 10).map(protocol => ({
        name: protocol.displayName.length > 12 ? protocol.displayName.substring(0, 12) + '...' : protocol.displayName,
        volume: getVolumeForPeriod(protocol, selectedPeriod),
        change: getChangeForPeriod(protocol, selectedPeriod) || 0,
      })),
      pieData: sortedProtocols.slice(0, 8).map((protocol, index) => ({
        name: protocol.displayName,
        value: getVolumeForPeriod(protocol, selectedPeriod),
        color: CHART_COLORS[index % CHART_COLORS.length],
      })),
      totalVolume: total
    };
  }, [sortedProtocols, selectedPeriod]);

  const fetchHistoricalData = async (protocol: DexProtocol) => {
    if (historicalData.has(protocol.id) || loadingHistory.has(protocol.id)) {
      return;
    }

    setLoadingHistory(prev => new Set(prev).add(protocol.id));

    try {
      const slug = protocol.slug || protocol.module || protocol.name.toLowerCase().replace(/\s+/g, '-');
      const response = await fetch(`/api/proxy/dex-history/${slug}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      
      const data: DexHistoricalData = await response.json();
      setHistoricalData(prev => new Map(prev).set(protocol.id, data));
    } catch (err) {
      console.error('Error fetching historical data:', err);
    } finally {
      setLoadingHistory(prev => {
        const newSet = new Set(prev);
        newSet.delete(protocol.id);
        return newSet;
      });
    }
  };

  const toggleProtocolExpansion = (protocol: DexProtocol) => {
    const newExpanded = new Set(expandedProtocols);
    if (newExpanded.has(protocol.id)) {
      newExpanded.delete(protocol.id);
    } else {
      newExpanded.add(protocol.id);
      // Fetch historical data when expanding
      fetchHistoricalData(protocol);
    }
    setExpandedProtocols(newExpanded);
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <span className="text-2xl">🔄</span>
            DEX Protocol Analysis
          </h3>
          <p className="text-gray-300 text-sm">
            Volume and performance comparison across top DEX protocols
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as '24h' | '7d' | '30d')}
            className="bg-gray-800 text-white px-3 py-1 rounded border border-gray-700 text-sm"
          >
            <option value="24h">24H</option>
            <option value="7d">7D</option>
            <option value="30d">30D</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'volume' | 'change')}
            className="bg-gray-800 text-white px-3 py-1 rounded border border-gray-700 text-sm"
          >
            <option value="volume">Sort by Volume</option>
            <option value="change">Sort by Change</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Total Volume ({selectedPeriod})</div>
          <div className="text-white text-lg font-bold">{formatNumber(totalVolume)}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Active DEX Protocols</div>
          <div className="text-white text-lg font-bold">{data.protocols.length}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Avg Change ({selectedPeriod})</div>
          <div className="text-white text-lg font-bold">
            {formatChange(
              sortedProtocols.reduce((sum, p) => sum + (getChangeForPeriod(p, selectedPeriod) || 0), 0) / 
              sortedProtocols.length
            )}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Volume Chart */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-4">Top 10 DEX Volume ({selectedPeriod})</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid {...commonChartConfig.grid} />
              <XAxis 
                dataKey="name" 
                {...commonChartConfig.axis}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                {...commonChartConfig.axis}
                tickFormatter={formatNumber}
              />
              <Tooltip 
                formatter={(value: number) => [formatNumber(value), 'Volume']}
                labelStyle={{ color: '#fff' }}
                {...commonChartConfig.tooltip}
              />
              <Bar dataKey="volume" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Market Share Pie */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-4">Market Share by Volume ({selectedPeriod})</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [formatNumber(value), 'Volume']}
                {...commonChartConfig.tooltip}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {pieData.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-sm" 
                  style={{ backgroundColor: entry.color }}
                ></div>
                <span className="text-xs text-gray-300 truncate">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DEX Protocol Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-4 text-gray-300 font-medium text-sm">Protocol</th>
                <th className="text-right p-4 text-gray-300 font-medium text-sm">Volume ({selectedPeriod})</th>
                <th className="text-right p-4 text-gray-300 font-medium text-sm">Change</th>
                <th className="text-right p-4 text-gray-300 font-medium text-sm">Chains</th>
                <th className="text-left p-4 text-gray-300 font-medium text-sm">Fee Structure</th>
                <th className="text-center p-4 text-gray-300 font-medium text-sm">Details</th>
              </tr>
            </thead>
            <tbody>
              {sortedProtocols.slice(0, 15).map((protocol, index) => (
                <React.Fragment key={protocol.id}>
                  <tr className="border-b border-gray-700 hover:bg-gray-750">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="text-gray-400 text-sm font-mono w-6">
                          {index + 1}
                        </div>
                        <img 
                          src={protocol.logo} 
                          alt={protocol.name}
                          className="w-8 h-8 rounded-full"
                          onError={(e) => {
                            e.currentTarget.src = '/api/placeholder/32/32';
                          }}
                        />
                        <div>
                          <div className="text-white font-medium text-sm">{protocol.displayName}</div>
                          <div className="text-gray-400 text-xs">{protocol.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="text-white font-medium">
                        {formatNumber(getVolumeForPeriod(protocol, selectedPeriod))}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        (getChangeForPeriod(protocol, selectedPeriod) || 0) >= 0 
                          ? 'bg-green-900 text-green-300' 
                          : 'bg-red-900 text-red-300'
                      }`}>
                        {formatChange(getChangeForPeriod(protocol, selectedPeriod))}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="text-gray-300 text-sm">{protocol.chains.length}</div>
                      <div className="text-gray-500 text-xs truncate max-w-32">
                        {protocol.chains.slice(0, 2).join(', ')}
                        {protocol.chains.length > 2 && ` +${protocol.chains.length - 2}`}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-gray-300 text-xs max-w-48">
                        {protocol.methodology?.UserFees ? 
                          protocol.methodology.UserFees.substring(0, 80) + (protocol.methodology.UserFees.length > 80 ? '...' : '') :
                          'Fee structure not available'
                        }
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <ExpandButton
                        isExpanded={expandedProtocols.has(protocol.id)}
                        onClick={() => toggleProtocolExpansion(protocol)}
                        title="Show all API data"
                      />
                    </td>
                  </tr>
                  {expandedProtocols.has(protocol.id) && (
                    <tr key={`${protocol.id}-expanded`} className="border-b border-gray-700 bg-gray-750">
                      <td colSpan={6} className="p-6">
                        <div className="bg-gray-900 rounded-lg p-4 border border-gray-600">
                          <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                            📊 Complete API Data for {protocol.displayName}
                          </h4>
                          
                          {/* Volume Metrics Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                            <div className="bg-gray-800 rounded-lg p-4">
                              <h5 className="text-blue-400 font-medium mb-3">Volume Metrics</h5>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">24h Volume:</span>
                                  <span className="text-white font-medium">{formatNumber(protocol.total24h)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">48h-24h Volume:</span>
                                  <span className="text-white font-medium">{formatNumber(protocol.total48hto24h)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">7d Volume:</span>
                                  <span className="text-white font-medium">{formatNumber(protocol.total7d)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">14d-7d Volume:</span>
                                  <span className="text-white font-medium">{formatNumber(protocol.total14dto7d)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">30d Volume:</span>
                                  <span className="text-white font-medium">{formatNumber(protocol.total30d)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">60d-30d Volume:</span>
                                  <span className="text-white font-medium">{formatNumber(protocol.total60dto30d)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">1y Volume:</span>
                                  <span className="text-white font-medium">{formatNumber(protocol.total1y)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">All Time Volume:</span>
                                  <span className="text-white font-medium">{formatNumber(protocol.totalAllTime)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">1y Daily Average:</span>
                                  <span className="text-white font-medium">{formatNumber(protocol.average1y)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">1y Monthly Average:</span>
                                  <span className="text-white font-medium">{formatNumber(protocol.monthlyAverage1y)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-gray-800 rounded-lg p-4">
                              <h5 className="text-green-400 font-medium mb-3">Change Metrics</h5>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">1d Change:</span>
                                  <span className={`font-medium ${protocol.change_1d >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                                    {formatChange(protocol.change_1d)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">7d Change:</span>
                                  <span className={`font-medium ${protocol.change_7d >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                                    {formatChange(protocol.change_7d)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">30d Change:</span>
                                  <span className={`font-medium ${protocol.change_1m >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                                    {formatChange(protocol.change_1m)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">7d vs 7d Change:</span>
                                  <span className={`font-medium ${protocol.change_7dover7d >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                                    {formatChange(protocol.change_7dover7d)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">30d vs 30d Change:</span>
                                  <span className={`font-medium ${protocol.change_30dover30d >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                                    {formatChange(protocol.change_30dover30d)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Volume 7 Days Ago:</span>
                                  <span className="text-white font-medium">{formatNumber(protocol.total7DaysAgo)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Volume 30 Days Ago:</span>
                                  <span className="text-white font-medium">{formatNumber(protocol.total30DaysAgo)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-gray-800 rounded-lg p-4">
                              <h5 className="text-purple-400 font-medium mb-3">Protocol Info</h5>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">DeFiLlama ID:</span>
                                  <span className="text-white font-medium">{protocol.defillamaId}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Module:</span>
                                  <span className="text-white font-medium">{protocol.module}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Category:</span>
                                  <span className="text-white font-medium">{protocol.category}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Protocol Type:</span>
                                  <span className="text-white font-medium">{protocol.protocolType}</span>
                                </div>
                                {protocol.slug && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Slug:</span>
                                    <span className="text-white font-medium">{protocol.slug}</span>
                                  </div>
                                )}
                                {protocol.parentProtocol && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Parent:</span>
                                    <span className="text-white font-medium">{protocol.parentProtocol}</span>
                                  </div>
                                )}
                                {protocol.methodologyURL && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Methodology:</span>
                                    <a 
                                      href={protocol.methodologyURL} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-400 hover:text-blue-300 underline text-xs"
                                    >
                                      View
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Historical Charts */}
                          <div className="mb-6">
                            <h5 className="text-pink-400 font-medium mb-4">📈 Historical Analysis (Volume, Fees & TVL)</h5>
                            {loadingHistory.has(protocol.id) ? (
                              <div className="bg-gray-800 rounded-lg p-8 text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-400 mx-auto mb-4"></div>
                                <p className="text-gray-400">Loading historical data...</p>
                              </div>
                            ) : historicalData.has(protocol.id) ? (
                              (() => {
                                const histData = historicalData.get(protocol.id)!;
                                
                                // Prepare total volume chart data (last 365 days)
                                const chartData = Array.isArray(histData.totalDataChart) ? 
                                  histData.totalDataChart
                                    .filter(item => 
                                      Array.isArray(item) && 
                                      item.length >= 2 && 
                                      typeof item[0] === 'number' && 
                                      typeof item[1] === 'number'
                                    )
                                    .slice(-365)
                                    .map(([timestamp, volume]) => ({
                                      date: new Date(timestamp * 1000).toLocaleDateString(),
                                      timestamp: timestamp * 1000,
                                      volume: volume,
                                      formattedVolume: formatNumber(volume),
                                    })) : [];

                                // Prepare chain breakdown data for the last 30 days
                                const chainBreakdownData: Record<string, any[]> = {};
                                Object.entries(histData.totalDataChartBreakdown || {}).forEach(([chain, data]) => {
                                  // Ensure data is an array with valid tuples before processing
                                  if (Array.isArray(data) && data.length > 0) {
                                    try {
                                      // Filter to ensure each item is a valid [timestamp, volume] tuple
                                      const validData = data.filter(item => 
                                        Array.isArray(item) && 
                                        item.length >= 2 && 
                                        typeof item[0] === 'number' && 
                                        typeof item[1] === 'number'
                                      );
                                      
                                      if (validData.length > 0) {
                                        chainBreakdownData[chain] = validData
                                          .slice(-30)
                                          .map(([timestamp, volume]) => ({
                                            date: new Date(timestamp * 1000).toLocaleDateString(),
                                            timestamp: timestamp * 1000,
                                            volume: volume,
                                            chain: chain,
                                          }));
                                      }
                                    } catch (error) {
                                      console.warn(`Error processing chain breakdown for ${chain}:`, error);
                                    }
                                  }
                                });

                                const chainColors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6B7280', '#EC4899', '#14B8A6'];

                                return (
                                  <div className="space-y-6">
                                    {/* Total Volume Chart */}
                                    <div className="bg-gray-800 rounded-lg p-4">
                                      <h6 className="text-white font-medium mb-3">Daily Volume (Last 365 Days)</h6>
                                      <ResponsiveContainer width="100%" height={300}>
                                        <AreaChart data={chartData}>
                                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                          <XAxis 
                                            dataKey="timestamp"
                                            type="number"
                                            scale="time"
                                            domain={['dataMin', 'dataMax']}
                                            tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
                                            tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                          />
                                          <YAxis 
                                            tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                            tickFormatter={formatNumber}
                                          />
                                          <Tooltip 
                                            formatter={(value: number) => [formatNumber(value), 'Volume']}
                                            labelFormatter={(timestamp) => `Date: ${new Date(timestamp).toLocaleDateString()}`}
                                            contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                                          />
                                          <Area 
                                            type="monotone" 
                                            dataKey="volume" 
                                            stroke="#EC4899" 
                                            fill="#EC4899" 
                                            fillOpacity={0.3}
                                          />
                                        </AreaChart>
                                      </ResponsiveContainer>
                                    </div>

                                    {/* Chain Breakdown Chart */}
                                    {Object.keys(chainBreakdownData).length > 0 && (
                                      <div className="bg-gray-800 rounded-lg p-4">
                                        <h6 className="text-white font-medium mb-3">Chain Volume Breakdown (Last 30 Days)</h6>
                                        <ResponsiveContainer width="100%" height={300}>
                                          <LineChart data={(() => {
                                            // Combine all chain data by timestamp
                                            const combinedData: Record<number, any> = {};
                                            Object.entries(chainBreakdownData).forEach(([chain, data]) => {
                                              data.forEach(item => {
                                                if (!combinedData[item.timestamp]) {
                                                  combinedData[item.timestamp] = { 
                                                    timestamp: item.timestamp,
                                                    date: item.date 
                                                  };
                                                }
                                                combinedData[item.timestamp][chain] = item.volume;
                                              });
                                            });
                                            return Object.values(combinedData).sort((a, b) => a.timestamp - b.timestamp);
                                          })()}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                            <XAxis 
                                              dataKey="timestamp"
                                              type="number"
                                              scale="time"
                                              domain={['dataMin', 'dataMax']}
                                              tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
                                              tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                            />
                                            <YAxis 
                                              tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                              tickFormatter={formatNumber}
                                            />
                                            <Tooltip 
                                              formatter={(value: number, name: string) => [formatNumber(value), name]}
                                              labelFormatter={(timestamp) => `Date: ${new Date(timestamp).toLocaleDateString()}`}
                                              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                                            />
                                            {Object.keys(chainBreakdownData).slice(0, 8).map((chain, index) => (
                                              <Line
                                                key={chain}
                                                type="monotone"
                                                dataKey={chain}
                                                stroke={chainColors[index % chainColors.length]}
                                                strokeWidth={2}
                                                dot={false}
                                              />
                                            ))}
                                          </LineChart>
                                        </ResponsiveContainer>
                                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                                          {Object.keys(chainBreakdownData).slice(0, 8).map((chain, index) => (
                                            <div key={chain} className="flex items-center gap-2">
                                              <div 
                                                className="w-3 h-3 rounded-sm" 
                                                style={{ backgroundColor: chainColors[index % chainColors.length] }}
                                              ></div>
                                              <span className="text-xs text-gray-300 capitalize">{chain}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Fee/Revenue Charts */}
                                    {Array.isArray(histData.feesDataChart) && histData.feesDataChart.length > 0 && (
                                      <div className="bg-gray-800 rounded-lg p-4">
                                        <h6 className="text-white font-medium mb-3">Daily Fees/Revenue (Last 365 Days)</h6>
                                        <ResponsiveContainer width="100%" height={300}>
                                          <AreaChart data={histData.feesDataChart
                                            .filter(item => 
                                              Array.isArray(item) && 
                                              item.length >= 2 && 
                                              typeof item[0] === 'number' && 
                                              typeof item[1] === 'number'
                                            )
                                            .slice(-365)
                                            .map(([timestamp, fees]) => ({
                                              date: new Date(timestamp * 1000).toLocaleDateString(),
                                              timestamp: timestamp * 1000,
                                              fees: fees,
                                              formattedFees: formatNumber(fees),
                                            }))}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                            <XAxis 
                                              dataKey="timestamp"
                                              type="number"
                                              scale="time"
                                              domain={['dataMin', 'dataMax']}
                                              tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
                                              tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                            />
                                            <YAxis 
                                              tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                              tickFormatter={formatNumber}
                                            />
                                            <Tooltip 
                                              formatter={(value: number) => [formatNumber(value), 'Fees']}
                                              labelFormatter={(timestamp) => `Date: ${new Date(timestamp).toLocaleDateString()}`}
                                              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                                            />
                                            <Area 
                                              type="monotone" 
                                              dataKey="fees" 
                                              stroke="#10B981" 
                                              fill="#10B981" 
                                              fillOpacity={0.3}
                                            />
                                          </AreaChart>
                                        </ResponsiveContainer>
                                      </div>
                                    )}

                                    {/* TVL Charts */}
                                    {Array.isArray(histData.tvlDataChart) && histData.tvlDataChart.length > 0 && (
                                      <div className="bg-gray-800 rounded-lg p-4">
                                        <h6 className="text-white font-medium mb-3">Total Value Locked (TVL) Historical</h6>
                                        <ResponsiveContainer width="100%" height={300}>
                                          <AreaChart data={histData.tvlDataChart
                                            .filter(item => 
                                              Array.isArray(item) && 
                                              item.length >= 2 && 
                                              typeof item[0] === 'number' && 
                                              typeof item[1] === 'number'
                                            )
                                            .map(([timestamp, tvl]) => ({
                                              date: new Date(timestamp * 1000).toLocaleDateString(),
                                              timestamp: timestamp * 1000,
                                              tvl: tvl,
                                              formattedTvl: formatNumber(tvl),
                                            }))}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                            <XAxis 
                                              dataKey="timestamp"
                                              type="number"
                                              scale="time"
                                              domain={['dataMin', 'dataMax']}
                                              tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
                                              tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                            />
                                            <YAxis 
                                              tick={{ fontSize: 10, fill: '#9CA3AF' }}
                                              tickFormatter={formatNumber}
                                            />
                                            <Tooltip 
                                              formatter={(value: number) => [formatNumber(value), 'TVL']}
                                              labelFormatter={(timestamp) => `Date: ${new Date(timestamp).toLocaleDateString()}`}
                                              contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                                            />
                                            <Area 
                                              type="monotone" 
                                              dataKey="tvl" 
                                              stroke="#F59E0B" 
                                              fill="#F59E0B" 
                                              fillOpacity={0.3}
                                            />
                                          </AreaChart>
                                        </ResponsiveContainer>
                                      </div>
                                    )}

                                    {/* Volume Statistics */}
                                    {Array.isArray(histData.totalDataChart) && histData.totalDataChart.length > 0 && (
                                      <div className="bg-gray-800 rounded-lg p-4">
                                        <h6 className="text-white font-medium mb-3">Volume Statistics</h6>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                          <div className="text-center">
                                            <div className="text-pink-400 text-sm">All-Time High</div>
                                            <div className="text-white font-medium">
                                              {formatNumber(Math.max(...histData.totalDataChart.map(([, vol]) => vol)))}
                                            </div>
                                          </div>
                                          <div className="text-center">
                                            <div className="text-pink-400 text-sm">All-Time Low</div>
                                            <div className="text-white font-medium">
                                              {formatNumber(Math.min(...histData.totalDataChart.filter(([, vol]) => vol > 0).map(([, vol]) => vol)))}
                                            </div>
                                          </div>
                                          <div className="text-center">
                                            <div className="text-pink-400 text-sm">30d Average</div>
                                            <div className="text-white font-medium">
                                              {formatNumber(
                                                histData.totalDataChart.slice(-30).reduce((sum, [, vol]) => sum + vol, 0) / 30
                                              )}
                                            </div>
                                          </div>
                                          <div className="text-center">
                                            <div className="text-pink-400 text-sm">Data Points</div>
                                            <div className="text-white font-medium">
                                              {histData.totalDataChart.length.toLocaleString()}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()
                            ) : (
                              <div className="bg-gray-800 rounded-lg p-8 text-center">
                                <p className="text-gray-400">No historical data available for this protocol</p>
                              </div>
                            )}
                          </div>

                          {/* Chain Breakdown */}
                          {Object.keys(protocol.breakdown24h).length > 0 && (
                            <div className="mb-6">
                              <h5 className="text-yellow-400 font-medium mb-3">24h Volume Breakdown by Chain</h5>
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {Object.entries(protocol.breakdown24h).map(([chain, protocols]) => (
                                  <div key={chain} className="bg-gray-800 rounded p-3">
                                    <div className="text-xs text-gray-400 capitalize mb-1">{chain}</div>
                                    {Object.entries(protocols).map(([protocolName, volume]) => (
                                      <div key={protocolName} className="text-white text-sm font-medium">
                                        {formatNumber(volume)}
                                      </div>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Revenue Methodology */}
                          {protocol.methodology && (
                            <div className="mb-6">
                              <h5 className="text-orange-400 font-medium mb-3">Revenue & Fee Methodology</h5>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(protocol.methodology).map(([key, value]) => (
                                  <div key={key} className="bg-gray-800 rounded p-3">
                                    <div className="text-xs text-gray-400 mb-1">{key}:</div>
                                    <div className="text-white text-sm">{value}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Linked Protocols */}
                          {protocol.linkedProtocols && protocol.linkedProtocols.length > 0 && (
                            <div>
                              <h5 className="text-cyan-400 font-medium mb-3">Linked Protocols</h5>
                              <div className="flex flex-wrap gap-2">
                                {protocol.linkedProtocols.map((linked, idx) => (
                                  <span key={idx} className="bg-gray-800 text-white px-3 py-1 rounded text-sm">
                                    {linked}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Complete Raw Data */}
                          <div className="mt-6 pt-4 border-t border-gray-600">
                            <details>
                              <summary className="text-gray-400 cursor-pointer hover:text-gray-300 text-sm mb-2">
                                🔍 View Raw API Data (JSON)
                              </summary>
                              <pre className="bg-black rounded p-3 text-xs text-green-400 overflow-auto max-h-64">
                                {JSON.stringify(protocol, null, 2)}
                              </pre>
                            </details>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-gray-500 text-xs">
          Data powered by DeFiLlama API • Updated in real-time • No user/wallet metrics available in current API
        </p>
      </div>
    </div>
  );
}