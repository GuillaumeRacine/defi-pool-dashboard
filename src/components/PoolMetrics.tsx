'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface PoolData {
  pool: string;
  project: string;
  symbol: string;
  chain: string;
  tvlUsd: number;
  volume24h: number;
  volumeChange1d: number;
  fees24h: number;
  feesChange1d: number;
  apy: number;
  apyBase: number;
  apyReward: number;
  count7d: number;
}

interface PoolVolumeHistory {
  date: string;
  volume: number;
  fees: number;
  tvl: number;
}

interface PoolComparison {
  poolName: string;
  apy: number;
  tvl: number;
  risk: 'Low' | 'Medium' | 'High';
  efficiency: number;
}

export default function PoolMetrics() {
  const [poolData, setPoolData] = useState<PoolData[]>([]);
  const [volumeHistory, setVolumeHistory] = useState<PoolVolumeHistory[]>([]);
  const [poolComparisons, setPoolComparisons] = useState<PoolComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChain, setSelectedChain] = useState<string>('All');
  const [selectedProject, setSelectedProject] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'tvl' | 'volume' | 'apy' | 'fees'>('tvl');

  useEffect(() => {
    loadPoolData();
  }, []);

  const loadPoolData = async () => {
    try {
      setLoading(true);
      
      // Simulated data based on real DeFiLlama pools structure
      const mockPoolData: PoolData[] = [
        { pool: '0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640', project: 'uniswap-v3', symbol: 'USDC-WETH-0.05%', chain: 'Ethereum', tvlUsd: 312457890, volume24h: 85234567, volumeChange1d: 12.3, fees24h: 426173, feesChange1d: 15.2, apy: 24.5, apyBase: 18.2, apyReward: 6.3, count7d: 1247 },
        { pool: '0xa374094527e1673a86de625aa59517c5de346d32', project: 'curve', symbol: 'stETH-ETH', chain: 'Ethereum', tvlUsd: 1845672109, volume24h: 23456789, volumeChange1d: -3.4, fees24h: 23457, feesChange1d: -5.1, apy: 8.7, apyBase: 8.7, apyReward: 0, count7d: 892 },
        { pool: '0x1f98431c8ad98523631ae4a59f267346ea31f984', project: 'uniswap-v3', symbol: 'WBTC-WETH-0.3%', chain: 'Ethereum', tvlUsd: 145623789, volume24h: 34567890, volumeChange1d: 8.9, fees24h: 103704, feesChange1d: 12.7, apy: 31.2, apyBase: 31.2, apyReward: 0, count7d: 567 },
        { pool: '0x99ac8ca7087fa4a2a1fb6357269965a2014abc35', project: 'balancer-v2', symbol: 'wstETH-WETH', chain: 'Ethereum', tvlUsd: 98765432, volume24h: 12345678, volumeChange1d: 5.6, fees24h: 37037, feesChange1d: 8.9, apy: 15.4, apyBase: 12.1, apyReward: 3.3, count7d: 423 },
        { pool: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', project: 'aave-v3', symbol: 'USDC', chain: 'Ethereum', tvlUsd: 567890123, volume24h: 0, volumeChange1d: 0, fees24h: 0, feesChange1d: 0, apy: 4.2, apyBase: 4.2, apyReward: 0, count7d: 0 },
        { pool: '0x3416cf6c708da44db2624d63ea0aaef7113527c6', project: 'uniswap-v3', symbol: 'USDC-USDT-0.01%', chain: 'Arbitrum', tvlUsd: 78901234, volume24h: 45678901, volumeChange1d: 7.2, fees24h: 4568, feesChange1d: 9.1, apy: 6.8, apyBase: 6.8, apyReward: 0, count7d: 1891 },
        { pool: '0x905dfcd5649217c42684f23958568e533c711aa3', project: 'curve', symbol: '3CRV', chain: 'Polygon', tvlUsd: 234567890, volume24h: 15678901, volumeChange1d: -1.2, fees24h: 15679, feesChange1d: -2.3, apy: 11.3, apyBase: 8.9, apyReward: 2.4, count7d: 672 },
        { pool: '0x6c6bc977e13df9b0de53b251522280bb72383700', project: 'sushiswap', symbol: 'DAI-USDC', chain: 'Arbitrum', tvlUsd: 34567890, volume24h: 8901234, volumeChange1d: 4.5, fees24h: 26704, feesChange1d: 6.8, apy: 28.9, apyBase: 28.9, apyReward: 0, count7d: 345 },
      ];

      // Simulated volume history
      const mockVolumeHistory: PoolVolumeHistory[] = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        volume: Math.random() * 200000000 + 50000000,
        fees: Math.random() * 600000 + 100000,
        tvl: Math.random() * 2000000000 + 500000000,
      }));

      // Calculate pool efficiency comparisons
      const mockPoolComparisons: PoolComparison[] = mockPoolData.map(pool => ({
        poolName: pool.symbol,
        apy: pool.apy,
        tvl: pool.tvlUsd,
        risk: pool.il7d < -3 ? 'High' : pool.il7d < -1 ? 'Medium' : 'Low',
        efficiency: (pool.apy * pool.tvlUsd) / (Math.abs(pool.il7d) + 1) / 1000000
      })).sort((a, b) => b.efficiency - a.efficiency);

      setPoolData(mockPoolData);
      setVolumeHistory(mockVolumeHistory);
      setPoolComparisons(mockPoolComparisons);
    } catch (error) {
      console.error('Failed to load pool data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: number): string => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatChange = (change: number): string => {
    const color = change >= 0 ? 'text-green-400' : 'text-red-400';
    const sign = change >= 0 ? '+' : '';
    return `<span class="${color}">${sign}${change.toFixed(1)}%</span>`;
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'text-green-400';
      case 'Medium': return 'text-yellow-400';
      case 'High': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const chains = ['All', ...Array.from(new Set(poolData.map(p => p.chain)))];
  const projects = ['All', ...Array.from(new Set(poolData.map(p => p.project)))];

  const filteredPools = poolData.filter(pool => {
    const chainMatch = selectedChain === 'All' || pool.chain === selectedChain;
    const projectMatch = selectedProject === 'All' || pool.project === selectedProject;
    return chainMatch && projectMatch;
  });

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Advanced Pool Metrics</h2>
          <div className="flex gap-2">
            <select
              value={selectedChain}
              onChange={(e) => setSelectedChain(e.target.value)}
              className="px-3 py-1 rounded text-sm bg-gray-700 text-gray-300 border border-gray-600"
            >
              {chains.map(chain => (
                <option key={chain} value={chain}>{chain}</option>
              ))}
            </select>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-3 py-1 rounded text-sm bg-gray-700 text-gray-300 border border-gray-600"
            >
              {projects.map(project => (
                <option key={project} value={project}>{project}</option>
              ))}
            </select>
            <button
              onClick={() => setSortBy('tvl')}
              className={`px-3 py-1 rounded text-sm ${sortBy === 'tvl' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              TVL
            </button>
            <button
              onClick={() => setSortBy('volume')}
              className={`px-3 py-1 rounded text-sm ${sortBy === 'volume' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              Volume
            </button>
            <button
              onClick={() => setSortBy('apy')}
              className={`px-3 py-1 rounded text-sm ${sortBy === 'apy' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              APY
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Pool Volume & Fees Trends */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Pool Activity Trends (30 Days)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={volumeHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={formatValue} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  formatter={(value: number, name: string) => [formatValue(value), name]}
                />
                <Area type="monotone" dataKey="volume" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} name="Volume" />
                <Area type="monotone" dataKey="fees" stackId="2" stroke="#10B981" fill="#10B981" fillOpacity={0.3} name="Fees" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Risk vs Reward Scatter */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Risk-Adjusted Returns</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={poolComparisons.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="poolName" tick={{ fill: '#9CA3AF', fontSize: 9 }} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  formatter={(value: number) => [`${value.toFixed(2)}`, 'Efficiency Score']}
                />
                <Bar dataKey="efficiency" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Key Pool Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-gray-900 rounded-lg">
            <div className="text-sm text-gray-400">Total Pool TVL</div>
            <div className="text-2xl font-bold text-blue-400">
              {formatValue(filteredPools.reduce((sum, pool) => sum + pool.tvlUsd, 0))}
            </div>
            <div className="text-xs text-gray-500 mt-1">{filteredPools.length} pools tracked</div>
          </div>
          <div className="p-4 bg-gray-900 rounded-lg">
            <div className="text-sm text-gray-400">24h Volume</div>
            <div className="text-2xl font-bold text-green-400">
              {formatValue(filteredPools.reduce((sum, pool) => sum + pool.volume24h, 0))}
            </div>
            <div className="text-xs text-gray-500 mt-1">Across all pools</div>
          </div>
          <div className="p-4 bg-gray-900 rounded-lg">
            <div className="text-sm text-gray-400">Avg APY</div>
            <div className="text-2xl font-bold text-yellow-400">
              {(filteredPools.reduce((sum, pool) => sum + pool.apy, 0) / filteredPools.length).toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500 mt-1">Weighted average</div>
          </div>
          <div className="p-4 bg-gray-900 rounded-lg">
            <div className="text-sm text-gray-400">24h Fees</div>
            <div className="text-2xl font-bold text-purple-400">
              {formatValue(filteredPools.reduce((sum, pool) => sum + pool.fees24h, 0))}
            </div>
            <div className="text-xs text-gray-500 mt-1">Total collected</div>
          </div>
        </div>

        {/* Pool Rankings Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-gray-300">Pool</th>
                <th className="px-4 py-3 text-left text-gray-300">Project</th>
                <th className="px-4 py-3 text-left text-gray-300">Chain</th>
                <th className="px-4 py-3 text-right text-gray-300">TVL</th>
                <th className="px-4 py-3 text-right text-gray-300">24h Volume</th>
                <th className="px-4 py-3 text-right text-gray-300">24h Fees</th>
                <th className="px-4 py-3 text-right text-gray-300">APY</th>
                <th className="px-4 py-3 text-center text-gray-300">Risk</th>
              </tr>
            </thead>
            <tbody>
              {filteredPools
                .sort((a, b) => {
                  switch (sortBy) {
                    case 'tvl': return b.tvlUsd - a.tvlUsd;
                    case 'volume': return b.volume24h - a.volume24h;
                    case 'apy': return b.apy - a.apy;
                    case 'fees': return b.fees24h - a.fees24h;
                    default: return b.tvlUsd - a.tvlUsd;
                  }
                })
                .map((pool, index) => {
                  const risk = pool.il7d < -3 ? 'High' : pool.il7d < -1 ? 'Medium' : 'Low';
                  return (
                    <tr key={pool.pool} className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{pool.symbol}</div>
                        <div className="text-xs text-gray-400">{pool.pool.slice(0, 10)}...</div>
                      </td>
                      <td className="px-4 py-3 text-gray-300 capitalize">{pool.project.replace('-', ' ')}</td>
                      <td className="px-4 py-3 text-gray-300">{pool.chain}</td>
                      <td className="px-4 py-3 text-right text-gray-300 font-mono">{formatValue(pool.tvlUsd)}</td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        <div>{formatValue(pool.volume24h)}</div>
                        <div className="text-xs" dangerouslySetInnerHTML={{ __html: formatChange(pool.volumeChange1d) }} />
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300">
                        <div>{formatValue(pool.fees24h)}</div>
                        <div className="text-xs" dangerouslySetInnerHTML={{ __html: formatChange(pool.feesChange1d) }} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-green-400 font-medium">{pool.apy.toFixed(1)}%</div>
                        <div className="text-xs text-gray-500">
                          Base: {pool.apyBase.toFixed(1)}% + Reward: {pool.apyReward.toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={getRiskColor(risk)}>{risk}</span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pool Efficiency Ranking */}
        <div className="mt-6 p-4 bg-gray-900 rounded-lg">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Top Efficient Pools (Risk-Adjusted)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {poolComparisons.slice(0, 3).map((pool, index) => (
              <div key={pool.poolName} className="p-3 bg-gray-800 rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">#{index + 1} {pool.poolName}</span>
                  <span className={`text-xs ${getRiskColor(pool.risk)}`}>{pool.risk} Risk</span>
                </div>
                <div className="text-lg font-bold text-green-400">{pool.apy.toFixed(1)}% APY</div>
                <div className="text-xs text-gray-500">
                  {formatValue(pool.tvl)} TVL • Efficiency: {pool.efficiency.toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}