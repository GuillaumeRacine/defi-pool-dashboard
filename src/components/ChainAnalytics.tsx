/**
 * Chain Analytics Component
 * Shows top chains with TVL data in collapsible card format
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatNumber, CHART_COLORS, commonChartConfig } from '@/lib/utils';
import { LoadingCard, ErrorCard, ExpandButton, RawDataViewer } from '@/components/common';

interface ChainData {
  gecko_id: string | null;
  tvl: number;
  tokenSymbol: string | null;
  cmcId: string | null;
  name: string;
  chainId: number | null;
}

export default function ChainAnalytics() {
  const [data, setData] = useState<ChainData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'tvl' | 'name'>('tvl');
  const [expandedChains, setExpandedChains] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchChainData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/proxy/chains');
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
        const chainData: ChainData[] = await response.json();

        // Filter and sort chains by TVL, remove those with 0 TVL
        const topChains = chainData
          .filter(chain => chain.tvl > 0)
          .sort((a, b) => b.tvl - a.tvl)
          .slice(0, 20);

        setData(topChains);
      } catch (err) {
        console.error('Error fetching chain data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchChainData();
  }, []);

  const sortedChains = useMemo(() => {
    return [...data].sort((a, b) => {
      if (sortBy === 'tvl') {
        return b.tvl - a.tvl;
      } else {
        return a.name.localeCompare(b.name);
      }
    });
  }, [data, sortBy]);

  // Memoize expensive calculations
  const { chartData, pieData, totalTvl } = useMemo(() => {
    if (!sortedChains.length) {
      return {
        chartData: [],
        pieData: [],
        totalTvl: 0
      };
    }

    const total = sortedChains.reduce((sum, chain) => sum + chain.tvl, 0);

    return {
      chartData: sortedChains.slice(0, 10).map(chain => ({
        name: chain.name.length > 12 ? chain.name.substring(0, 12) + '...' : chain.name,
        tvl: chain.tvl,
      })),
      pieData: sortedChains.slice(0, 8).map((chain, index) => ({
        name: chain.name,
        value: chain.tvl,
        percentage: ((chain.tvl / total) * 100).toFixed(1),
        color: CHART_COLORS[index % CHART_COLORS.length],
      })),
      totalTvl: total
    };
  }, [sortedChains]);

  if (loading) {
    return <LoadingCard title="⛓️ Chain Analytics" />;
  }

  if (error || !data) {
    return <ErrorCard title="⛓️ Chain Analytics" error={error || 'Unknown error'} />;
  }

  const toggleChainExpansion = (chainName: string) => {
    const newExpanded = new Set(expandedChains);
    if (newExpanded.has(chainName)) {
      newExpanded.delete(chainName);
    } else {
      newExpanded.add(chainName);
    }
    setExpandedChains(newExpanded);
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <span className="text-lg">⛓️</span>
            Chain Analytics
          </h3>
          <p className="text-gray-300 text-xs">
            TVL and metrics comparison across blockchain networks
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'tvl' | 'name')}
            className="bg-gray-800 text-white px-3 py-1 rounded border border-gray-700 text-sm"
          >
            <option value="tvl">Sort by TVL</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Total TVL (Top 20)</div>
          <div className="text-white text-lg font-bold">{formatNumber(totalTvl)}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Active Chains</div>
          <div className="text-white text-lg font-bold">{data.length}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Ethereum Dominance</div>
          <div className="text-white text-lg font-bold">
            {((sortedChains.find(c => c.name === 'Ethereum')?.tvl || 0) / totalTvl * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* TVL Chart */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-4 text-sm">Top 10 Chains by TVL</h4>
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
                formatter={(value: number) => [formatNumber(value), 'TVL']}
                labelStyle={{ color: '#fff' }}
                {...commonChartConfig.tooltip}
              />
              <Bar dataKey="tvl" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Market Share Pie */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-4 text-sm">TVL Market Share</h4>
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
                formatter={(value: number) => [formatNumber(value), 'TVL']}
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

      {/* Chain Cards Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-4 text-gray-300 font-medium text-sm">Rank</th>
                <th className="text-left p-4 text-gray-300 font-medium text-sm">Chain</th>
                <th className="text-right p-4 text-gray-300 font-medium text-sm">TVL</th>
                <th className="text-right p-4 text-gray-300 font-medium text-sm">Market Share</th>
                <th className="text-left p-4 text-gray-300 font-medium text-sm">Token</th>
                <th className="text-center p-4 text-gray-300 font-medium text-sm">Details</th>
              </tr>
            </thead>
            <tbody>
              {sortedChains.slice(0, 15).map((chain, index) => (
                <React.Fragment key={chain.name}>
                  <tr className="border-b border-gray-700 hover:bg-gray-750">
                    <td className="p-4">
                      <div className="text-gray-400 text-sm font-mono w-6">
                        {index + 1}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="text-white font-medium text-sm">{chain.name}</div>
                          <div className="text-gray-400 text-xs">
                            {chain.chainId ? `Chain ID: ${chain.chainId}` : 'No Chain ID'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="text-white font-medium">
                        {formatNumber(chain.tvl)}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="text-gray-300">
                        {((chain.tvl / totalTvl) * 100).toFixed(2)}%
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-gray-300 text-sm">
                        {chain.tokenSymbol || 'N/A'}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <ExpandButton
                        isExpanded={expandedChains.has(chain.name)}
                        onClick={() => toggleChainExpansion(chain.name)}
                        title="Show all API data"
                      />
                    </td>
                  </tr>
                  {expandedChains.has(chain.name) && (
                    <tr key={`${chain.name}-expanded`} className="border-b border-gray-700 bg-gray-750">
                      <td colSpan={6} className="p-6">
                        <div className="bg-gray-900 rounded-lg p-4 border border-gray-600">
                          <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                            📊 Complete API Data for {chain.name}
                          </h4>
                          
                          {/* Chain Details Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="bg-gray-800 rounded-lg p-4">
                              <h5 className="text-blue-400 font-medium mb-3">Basic Info</h5>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Name:</span>
                                  <span className="text-white font-medium">{chain.name}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Token Symbol:</span>
                                  <span className="text-white font-medium">{chain.tokenSymbol || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Chain ID:</span>
                                  <span className="text-white font-medium">{chain.chainId || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Gecko ID:</span>
                                  <span className="text-white font-medium">{chain.gecko_id || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">CMC ID:</span>
                                  <span className="text-white font-medium">{chain.cmcId || 'N/A'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-gray-800 rounded-lg p-4">
                              <h5 className="text-green-400 font-medium mb-3">TVL Metrics</h5>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Total TVL:</span>
                                  <span className="text-white font-medium">{formatNumber(chain.tvl)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Market Share:</span>
                                  <span className="text-white font-medium">
                                    {((chain.tvl / totalTvl) * 100).toFixed(3)}%
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Rank:</span>
                                  <span className="text-white font-medium">#{index + 1}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Raw TVL:</span>
                                  <span className="text-white font-medium font-mono text-xs">
                                    ${chain.tvl.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="bg-gray-800 rounded-lg p-4">
                              <h5 className="text-purple-400 font-medium mb-3">External Links</h5>
                              <div className="space-y-2 text-sm">
                                {chain.gecko_id && (
                                  <div>
                                    <span className="text-gray-400">CoinGecko:</span>
                                    <a 
                                      href={`https://www.coingecko.com/en/coins/${chain.gecko_id}`}
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-400 hover:text-blue-300 underline ml-2 text-xs"
                                    >
                                      View
                                    </a>
                                  </div>
                                )}
                                {chain.cmcId && (
                                  <div>
                                    <span className="text-gray-400">CoinMarketCap:</span>
                                    <a 
                                      href={`https://coinmarketcap.com/currencies/${chain.cmcId}`}
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-400 hover:text-blue-300 underline ml-2 text-xs"
                                    >
                                      View
                                    </a>
                                  </div>
                                )}
                                <div>
                                  <span className="text-gray-400">DeFiLlama:</span>
                                  <a 
                                    href={`https://defillama.com/chain/${chain.name.toLowerCase()}`}
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 underline ml-2 text-xs"
                                  >
                                    View
                                  </a>
                                </div>
                              </div>
                            </div>
                          </div>

                          <RawDataViewer data={chain} title={chain.name} />
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
          Data powered by DeFiLlama API • Updated in real-time • Showing top {data.length} chains by TVL
        </p>
      </div>
    </div>
  );
}