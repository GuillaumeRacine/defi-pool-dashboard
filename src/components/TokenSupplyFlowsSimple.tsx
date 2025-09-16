/**
 * Token Supply & Flows Component (Simplified)
 * Shows token supply for chains, stablecoin inflows/outflows
 */

'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatNumber, commonChartConfig } from '@/lib/utils';
import { LoadingCard, ErrorCard } from '@/components/common';

interface StablecoinData {
  id: string;
  name: string;
  symbol: string;
  circulating: { peggedUSD: number };
  circulatingPrevDay: { peggedUSD: number };
}

export default function TokenSupplyFlowsSimple() {
  const [stablecoins, setStablecoins] = useState<StablecoinData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/proxy/stablecoins');
        if (!response.ok) {
          throw new Error(`Failed to fetch stablecoins: ${response.status}`);
        }
        const data = await response.json();
        setStablecoins(data.peggedAssets?.slice(0, 10) || []);
      } catch (err) {
        console.error('Error fetching stablecoin data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <LoadingCard title="💰 Token Supply & Flows" />;
  }

  if (error) {
    return <ErrorCard title="💰 Token Supply & Flows" error={error} />;
  }

  const totalSupply = stablecoins.reduce((sum, coin) => sum + coin.circulating.peggedUSD, 0);
  const totalDayChange = stablecoins.reduce((sum, coin) => {
    const current = coin.circulating.peggedUSD;
    const prev = coin.circulatingPrevDay.peggedUSD;
    return sum + (current - prev);
  }, 0);

  const chartData = stablecoins.map(coin => ({
    name: coin.symbol,
    supply: coin.circulating.peggedUSD,
    change: ((coin.circulating.peggedUSD - coin.circulatingPrevDay.peggedUSD) / coin.circulatingPrevDay.peggedUSD) * 100
  }));

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <span className="text-lg">💰</span>
            Token Supply & Flows
          </h3>
          <p className="text-gray-300 text-xs">
            Stablecoin supply and market movements
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Total Stablecoin Supply</div>
          <div className="text-white text-lg font-bold">{formatNumber(totalSupply)}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">24h Net Flow</div>
          <div className={`text-lg font-bold ${totalDayChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalDayChange >= 0 ? '+' : ''}{formatNumber(totalDayChange)}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Active Stablecoins</div>
          <div className="text-white text-lg font-bold">{stablecoins.length}</div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <h4 className="text-white font-semibold mb-4 text-sm">Top Stablecoins by Supply</h4>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid {...commonChartConfig.grid} />
            <XAxis
              dataKey="name"
              {...commonChartConfig.axis}
            />
            <YAxis
              {...commonChartConfig.axis}
              tickFormatter={formatNumber}
            />
            <Tooltip
              formatter={(value: number) => [formatNumber(value), 'Supply']}
              labelStyle={{ color: '#fff' }}
              {...commonChartConfig.tooltip}
            />
            <Bar dataKey="supply" fill="#10B981" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-4 text-gray-300 font-medium text-sm">Rank</th>
                <th className="text-left p-4 text-gray-300 font-medium text-sm">Stablecoin</th>
                <th className="text-right p-4 text-gray-300 font-medium text-sm">Supply</th>
                <th className="text-right p-4 text-gray-300 font-medium text-sm">24h Change</th>
              </tr>
            </thead>
            <tbody>
              {stablecoins.map((coin, index) => {
                const dayChange = ((coin.circulating.peggedUSD - coin.circulatingPrevDay.peggedUSD) / coin.circulatingPrevDay.peggedUSD) * 100;
                return (
                  <tr key={coin.id} className="border-b border-gray-700 hover:bg-gray-750">
                    <td className="p-4">
                      <div className="text-gray-400 text-sm font-mono w-6">
                        {index + 1}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-white font-medium text-sm">{coin.name}</div>
                      <div className="text-gray-400 text-xs">{coin.symbol}</div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="text-white font-medium">
                        {formatNumber(coin.circulating.peggedUSD)}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className={`font-medium ${dayChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {dayChange >= 0 ? '+' : ''}{dayChange.toFixed(2)}%
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-gray-500 text-xs">
          Data powered by DeFiLlama Stablecoins API • Showing top {stablecoins.length} stablecoins by market cap
        </p>
      </div>
    </div>
  );
}