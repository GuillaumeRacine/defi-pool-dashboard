'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';

interface ProtocolData {
  id: string;
  name: string;
  category: string;
  tvl: number;
  tvlChange1d: number;
  tvlChange7d: number;
  tvlChange30d: number;
  volume24h?: number;
  fees24h?: number;
  healthScore: number;
  chains: string[];
}

interface CategoryData {
  category: string;
  totalTvl: number;
  protocolCount: number;
  avgGrowth7d: number;
  topProtocol: string;
}

export default function ProtocolInsights() {
  const [protocolData, setProtocolData] = useState<ProtocolData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedMetric, setSelectedMetric] = useState<'tvl' | 'growth' | 'health'>('tvl');

  useEffect(() => {
    loadProtocolData();
  }, []);

  const loadProtocolData = async () => {
    try {
      setLoading(true);
      
      // Simulated data based on real DeFiLlama protocols structure
      const mockProtocolData: ProtocolData[] = [
        { id: 'lido', name: 'Lido', category: 'Liquid Staking', tvl: 32845672198, tvlChange1d: -0.2, tvlChange7d: 5.1, tvlChange30d: 12.3, volume24h: 0, fees24h: 15234567, healthScore: 95, chains: ['Ethereum', 'Solana', 'Polygon'] },
        { id: 'aave-v3', name: 'Aave V3', category: 'Lending', tvl: 18234567890, tvlChange1d: 1.2, tvlChange7d: 8.4, tvlChange30d: 15.7, volume24h: 234567890, fees24h: 1234567, healthScore: 92, chains: ['Ethereum', 'Arbitrum', 'Avalanche'] },
        { id: 'uniswap-v3', name: 'Uniswap V3', category: 'DEX', tvl: 4523419876, tvlChange1d: 2.1, tvlChange7d: -1.3, tvlChange30d: 8.9, volume24h: 1234567890, fees24h: 3703703, healthScore: 90, chains: ['Ethereum', 'Arbitrum', 'Polygon'] },
        { id: 'makerdao', name: 'MakerDAO', category: 'CDP', tvl: 8976543210, tvlChange1d: -0.8, tvlChange7d: 2.4, tvlChange30d: -3.2, volume24h: 0, fees24h: 2345678, healthScore: 88, chains: ['Ethereum'] },
        { id: 'compound-v3', name: 'Compound V3', category: 'Lending', tvl: 3456789012, tvlChange1d: 0.5, tvlChange7d: 4.2, tvlChange30d: 11.1, volume24h: 123456789, fees24h: 567890, healthScore: 85, chains: ['Ethereum', 'Arbitrum'] },
        { id: 'convex', name: 'Convex Finance', category: 'Yield', tvl: 2345678901, tvlChange1d: -1.1, tvlChange7d: -2.8, tvlChange30d: 1.4, volume24h: 0, fees24h: 234567, healthScore: 83, chains: ['Ethereum'] },
        { id: 'curve', name: 'Curve', category: 'DEX', tvl: 1876543210, tvlChange1d: 0.8, tvlChange7d: 3.1, tvlChange30d: 6.7, volume24h: 345678901, fees24h: 345679, healthScore: 89, chains: ['Ethereum', 'Arbitrum', 'Polygon'] },
        { id: 'yearn', name: 'Yearn Finance', category: 'Yield', tvl: 876543210, tvlChange1d: 1.5, tvlChange7d: -0.9, tvlChange30d: 4.8, volume24h: 0, fees24h: 123456, healthScore: 81, chains: ['Ethereum', 'Arbitrum'] },
        { id: 'balancer-v2', name: 'Balancer V2', category: 'DEX', tvl: 1234567890, tvlChange1d: -0.3, tvlChange7d: 1.8, tvlChange30d: 7.2, volume24h: 234567890, fees24h: 469136, healthScore: 86, chains: ['Ethereum', 'Arbitrum', 'Polygon'] },
        { id: 'rocket-pool', name: 'Rocket Pool', category: 'Liquid Staking', tvl: 3567890123, tvlChange1d: 2.3, tvlChange7d: 9.1, tvlChange30d: 18.4, volume24h: 0, fees24h: 789012, healthScore: 91, chains: ['Ethereum'] },
      ];

      // Calculate category analytics
      const categoryMap = new Map<string, { protocols: ProtocolData[], totalTvl: number, growthSum: number }>();
      
      mockProtocolData.forEach(protocol => {
        if (!categoryMap.has(protocol.category)) {
          categoryMap.set(protocol.category, { protocols: [], totalTvl: 0, growthSum: 0 });
        }
        const category = categoryMap.get(protocol.category)!;
        category.protocols.push(protocol);
        category.totalTvl += protocol.tvl;
        category.growthSum += protocol.tvlChange7d;
      });

      const mockCategoryData: CategoryData[] = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        totalTvl: data.totalTvl,
        protocolCount: data.protocols.length,
        avgGrowth7d: data.growthSum / data.protocols.length,
        topProtocol: data.protocols.sort((a, b) => b.tvl - a.tvl)[0].name
      })).sort((a, b) => b.totalTvl - a.totalTvl);

      setProtocolData(mockProtocolData);
      setCategoryData(mockCategoryData);
    } catch (error) {
      console.error('Failed to load protocol data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTvl = (value: number): string => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toFixed(2)}`;
  };

  const formatChange = (change: number): string => {
    const color = change >= 0 ? 'text-green-400' : 'text-red-400';
    const sign = change >= 0 ? '+' : '';
    return `<span class="${color}">${sign}${change.toFixed(1)}%</span>`;
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 80) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getHealthLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    return 'Poor';
  };

  const filteredProtocols = selectedCategory === 'All' 
    ? protocolData 
    : protocolData.filter(p => p.category === selectedCategory);

  const categories = ['All', ...Array.from(new Set(protocolData.map(p => p.category)))];

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
          <h2 className="text-xl font-bold text-white">Protocol-Level Insights</h2>
          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1 rounded text-sm bg-gray-700 text-gray-300 border border-gray-600"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <button
              onClick={() => setSelectedMetric('tvl')}
              className={`px-3 py-1 rounded text-sm ${selectedMetric === 'tvl' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              TVL
            </button>
            <button
              onClick={() => setSelectedMetric('growth')}
              className={`px-3 py-1 rounded text-sm ${selectedMetric === 'growth' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              Growth
            </button>
            <button
              onClick={() => setSelectedMetric('health')}
              className={`px-3 py-1 rounded text-sm ${selectedMetric === 'health' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              Health
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Category Analysis Chart */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Category Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="category" tick={{ fill: '#9CA3AF', fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={formatTvl} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  formatter={(value: number) => [formatTvl(value), 'Total TVL']}
                />
                <Bar dataKey="totalTvl" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Protocol Health vs TVL Scatter */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Health Score vs TVL</h3>
            <ResponsiveContainer width="100%" height={250}>
              <ScatterChart data={filteredProtocols}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  type="number" 
                  dataKey="tvl" 
                  tick={{ fill: '#9CA3AF', fontSize: 10 }} 
                  tickFormatter={formatTvl}
                  scale="log"
                  domain={['dataMin', 'dataMax']}
                />
                <YAxis 
                  type="number" 
                  dataKey="healthScore" 
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  domain={[60, 100]}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  formatter={(value: number, name: string) => [
                    name === 'tvl' ? formatTvl(value) : value,
                    name === 'tvl' ? 'TVL' : 'Health Score'
                  ]}
                />
                <Scatter dataKey="healthScore" fill="#10B981" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {categoryData.slice(0, 4).map((category) => (
            <div key={category.category} className="p-4 bg-gray-900 rounded-lg">
              <div className="text-sm text-gray-400">{category.category}</div>
              <div className="text-xl font-bold text-white">{formatTvl(category.totalTvl)}</div>
              <div className="text-xs text-gray-500 mt-1">
                {category.protocolCount} protocols • {category.avgGrowth7d >= 0 ? '+' : ''}{category.avgGrowth7d.toFixed(1)}% avg growth
              </div>
              <div className="text-xs text-blue-400 mt-1">Leader: {category.topProtocol}</div>
            </div>
          ))}
        </div>

        {/* Protocol Rankings Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-gray-300">Protocol</th>
                <th className="px-4 py-3 text-left text-gray-300">Category</th>
                <th className="px-4 py-3 text-right text-gray-300">TVL</th>
                <th className="px-4 py-3 text-right text-gray-300">24h Change</th>
                <th className="px-4 py-3 text-right text-gray-300">7d Change</th>
                <th className="px-4 py-3 text-right text-gray-300">30d Change</th>
                <th className="px-4 py-3 text-center text-gray-300">Health Score</th>
                <th className="px-4 py-3 text-left text-gray-300">Chains</th>
              </tr>
            </thead>
            <tbody>
              {filteredProtocols
                .sort((a, b) => {
                  if (selectedMetric === 'tvl') return b.tvl - a.tvl;
                  if (selectedMetric === 'growth') return b.tvlChange7d - a.tvlChange7d;
                  return b.healthScore - a.healthScore;
                })
                .map((protocol, index) => (
                  <tr key={protocol.id} className="border-b border-gray-700 hover:bg-gray-750">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{protocol.name}</div>
                      <div className="text-xs text-gray-400">#{index + 1}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">{protocol.category}</td>
                    <td className="px-4 py-3 text-right text-gray-300 font-mono">{formatTvl(protocol.tvl)}</td>
                    <td className="px-4 py-3 text-right" dangerouslySetInnerHTML={{ __html: formatChange(protocol.tvlChange1d) }} />
                    <td className="px-4 py-3 text-right" dangerouslySetInnerHTML={{ __html: formatChange(protocol.tvlChange7d) }} />
                    <td className="px-4 py-3 text-right" dangerouslySetInnerHTML={{ __html: formatChange(protocol.tvlChange30d) }} />
                    <td className="px-4 py-3 text-center">
                      <span className={getHealthColor(protocol.healthScore)}>
                        {protocol.healthScore}
                      </span>
                      <div className="text-xs text-gray-500">{getHealthLabel(protocol.healthScore)}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      <div className="text-xs">
                        {protocol.chains.slice(0, 2).join(', ')}
                        {protocol.chains.length > 2 && ` +${protocol.chains.length - 2}`}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Key Insights */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-900 rounded-lg">
            <div className="text-sm text-gray-400">Fastest Growing Category</div>
            <div className="text-2xl font-bold text-green-400">
              {categoryData.sort((a, b) => b.avgGrowth7d - a.avgGrowth7d)[0]?.category || 'N/A'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {categoryData.length > 0 ? `+${categoryData[0].avgGrowth7d.toFixed(1)}% avg growth` : 'No data'}
            </div>
          </div>
          <div className="p-4 bg-gray-900 rounded-lg">
            <div className="text-sm text-gray-400">Highest Health Score</div>
            <div className="text-2xl font-bold text-blue-400">
              {protocolData.sort((a, b) => b.healthScore - a.healthScore)[0]?.name || 'N/A'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {protocolData.length > 0 ? `${protocolData[0].healthScore}/100 health` : 'No data'}
            </div>
          </div>
          <div className="p-4 bg-gray-900 rounded-lg">
            <div className="text-sm text-gray-400">Total Protocols</div>
            <div className="text-2xl font-bold text-purple-400">{protocolData.length}</div>
            <div className="text-xs text-gray-500 mt-1">Across {categoryData.length} categories</div>
          </div>
        </div>
      </div>
    </div>
  );
}