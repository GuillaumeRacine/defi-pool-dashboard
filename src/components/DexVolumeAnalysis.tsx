'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DexData {
  name: string;
  volume24h: number;
  volume7d: number;
  fees24h: number;
  marketShare: number;
  change24h: number;
  change7d: number;
}

interface VolumeChartData {
  date: string;
  volume: number;
  fees: number;
}

export default function DexVolumeAnalysis() {
  const [dexData, setDexData] = useState<DexData[]>([]);
  const [volumeHistory, setVolumeHistory] = useState<VolumeChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    loadDexData();
  }, []);

  const loadDexData = async () => {
    try {
      setLoading(true);
      
      // Simulated data - replace with actual API call to https://api.llama.fi/overview/dexs
      const mockDexData: DexData[] = [
        { name: 'Uniswap', volume24h: 1234567890, volume7d: 8642356789, fees24h: 3703703, marketShare: 42.5, change24h: 5.2, change7d: -2.1 },
        { name: 'PancakeSwap', volume24h: 456789012, volume7d: 3197523084, fees24h: 1370367, marketShare: 15.7, change24h: -3.4, change7d: 8.9 },
        { name: 'Curve', volume24h: 345678901, volume7d: 2419752167, fees24h: 345679, marketShare: 11.9, change24h: 12.1, change7d: 15.3 },
        { name: 'Balancer', volume24h: 234567890, volume7d: 1642975213, fees24h: 469136, marketShare: 8.1, change24h: -1.2, change7d: 3.4 },
        { name: 'SushiSwap', volume24h: 123456789, volume7d: 864197523, fees24h: 370370, marketShare: 4.3, change24h: 7.8, change7d: -5.6 },
        { name: 'Others', volume24h: 512345678, volume7d: 3586419746, fees24h: 1537037, marketShare: 17.5, change24h: 2.3, change7d: 1.1 },
      ];

      // Simulated volume history
      const mockVolumeHistory: VolumeChartData[] = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        volume: Math.random() * 5000000000 + 2000000000,
        fees: Math.random() * 15000000 + 5000000,
      }));

      setDexData(mockDexData);
      setVolumeHistory(mockVolumeHistory);
    } catch (error) {
      console.error('Failed to load DEX data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatVolume = (value: number): string => {
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

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6B7280'];

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
          <h2 className="text-xl font-bold text-white">DEX Volume & Fees Analysis</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setTimeRange('24h')}
              className={`px-3 py-1 rounded text-sm ${timeRange === '24h' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              24H
            </button>
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1 rounded text-sm ${timeRange === '7d' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              7D
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-3 py-1 rounded text-sm ${timeRange === '30d' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              30D
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Volume Trends Chart */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Daily Volume Trends</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={volumeHistory.slice(-7)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} tickFormatter={formatVolume} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  formatter={(value: number) => formatVolume(value)}
                />
                <Line type="monotone" dataKey="volume" stroke="#3B82F6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Market Share Pie Chart */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Market Share Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={dexData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: any) => `${props.name}: ${props.marketShare}%`}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="marketShare"
                >
                  {dexData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* DEX Rankings Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-gray-300">DEX</th>
                <th className="px-4 py-3 text-right text-gray-300">24h Volume</th>
                <th className="px-4 py-3 text-right text-gray-300">7d Volume</th>
                <th className="px-4 py-3 text-right text-gray-300">24h Fees</th>
                <th className="px-4 py-3 text-right text-gray-300">Market Share</th>
                <th className="px-4 py-3 text-right text-gray-300">24h Change</th>
                <th className="px-4 py-3 text-right text-gray-300">7d Change</th>
              </tr>
            </thead>
            <tbody>
              {dexData.map((dex, index) => (
                <tr key={index} className="border-b border-gray-700 hover:bg-gray-750">
                  <td className="px-4 py-3 font-medium text-white">{dex.name}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{formatVolume(dex.volume24h)}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{formatVolume(dex.volume7d)}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{formatVolume(dex.fees24h)}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{dex.marketShare.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right" dangerouslySetInnerHTML={{ __html: formatChange(dex.change24h) }} />
                  <td className="px-4 py-3 text-right" dangerouslySetInnerHTML={{ __html: formatChange(dex.change7d) }} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Trading Activity Indicator */}
        <div className="mt-6 p-4 bg-gray-900 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-300">Market Activity</h3>
              <p className="text-xs text-gray-500 mt-1">Based on 7-day volume trend</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-green-400">BULLISH</span>
              <p className="text-xs text-gray-400 mt-1">+12.3% vs last week</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}