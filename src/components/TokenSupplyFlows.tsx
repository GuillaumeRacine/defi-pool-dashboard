/**
 * Token Supply & Flows Component
 * Shows token supply for chains, stablecoin inflows/outflows, onchain and ETF data
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { formatNumber, commonChartConfig } from '@/lib/utils';
import { LoadingCard, ErrorCard } from '@/components/common';

interface StablecoinData {
  id: string;
  name: string;
  symbol: string;
  circulating: { peggedUSD: number };
  circulatingPrevDay: { peggedUSD: number };
  circulatingPrevWeek: { peggedUSD: number };
  circulatingPrevMonth: { peggedUSD: number };
  chainCirculating: Record<string, {
    current: { peggedUSD: number };
    circulatingPrevDay: { peggedUSD: number };
  }>;
}

interface FlowData {
  date: string;
  totalCirculating: { peggedUSD: number };
  totalCirculatingUSD: { peggedUSD: number };
}

interface ChainFlow {
  chain: string;
  currentSupply: number;
  dayChange: number;
  weekChange: number;
  monthChange: number;
  marketShare: number;
}

export default function TokenSupplyFlows() {
  const [stablecoins, setStablecoins] = useState<StablecoinData[]>([]);
  const [selectedChain, setSelectedChain] = useState<string>('ethereum');
  const [flowsData, setFlowsData] = useState<FlowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch stablecoins data
        const stablecoinsResponse = await fetch('/api/proxy/stablecoins');
        if (!stablecoinsResponse.ok) {
          throw new Error(`Failed to fetch stablecoins: ${stablecoinsResponse.status}`);
        }
        const stablecoinsData = await stablecoinsResponse.json();
        setStablecoins(stablecoinsData.peggedAssets || []);

        // Fetch flows data for selected chain
        const flowsResponse = await fetch(`/api/proxy/stablecoin-flows?chain=${selectedChain}`);
        if (!flowsResponse.ok) {
          throw new Error(`Failed to fetch flows: ${flowsResponse.status}`);
        }
        const flowsData = await flowsResponse.json();

        // Transform and filter flows data based on time range
        const now = Date.now() / 1000;
        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
        const cutoff = now - (days * 24 * 60 * 60);

        const filteredFlows = flowsData
          .filter((flow: any) => parseInt(flow.date) >= cutoff)
          .map((flow: any) => ({
            date: new Date(parseInt(flow.date) * 1000).toISOString().split('T')[0],
            totalCirculating: flow.totalCirculating,
            totalCirculatingUSD: flow.totalCirculatingUSD
          }));

        setFlowsData(filteredFlows);
      } catch (err) {
        console.error('Error fetching token supply data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedChain, timeRange]);

  // Calculate chain flows and metrics
  const chainFlows = useMemo(() => {
    if (!stablecoins.length) return [];

    const totalSupply = stablecoins.reduce((sum, coin) => sum + coin.circulating.peggedUSD, 0);
    const chainSupplyMap = new Map<string, number>();
    const chainPrevDayMap = new Map<string, number>();
    const chainPrevWeekMap = new Map<string, number>();
    const chainPrevMonthMap = new Map<string, number>();

    // Aggregate by chain
    stablecoins.forEach(coin => {
      if (coin.chainCirculating) {
        Object.entries(coin.chainCirculating).forEach(([chain, data]) => {
          const current = data.current?.peggedUSD || 0;
          const prevDay = data.circulatingPrevDay?.peggedUSD || 0;

          chainSupplyMap.set(chain, (chainSupplyMap.get(chain) || 0) + current);
          chainPrevDayMap.set(chain, (chainPrevDayMap.get(chain) || 0) + prevDay);
        });
      }

      // Add global metrics for comparison
      const globalPrevWeek = coin.circulatingPrevWeek?.peggedUSD || 0;
      const globalPrevMonth = coin.circulatingPrevMonth?.peggedUSD || 0;
      chainPrevWeekMap.set('Global', (chainPrevWeekMap.get('Global') || 0) + globalPrevWeek);
      chainPrevMonthMap.set('Global', (chainPrevMonthMap.get('Global') || 0) + globalPrevMonth);
    });

    const flows: ChainFlow[] = [];

    chainSupplyMap.forEach((supply, chain) => {
      const prevDay = chainPrevDayMap.get(chain) || supply;
      const dayChange = ((supply - prevDay) / prevDay) * 100;

      flows.push({
        chain,
        currentSupply: supply,
        dayChange: isFinite(dayChange) ? dayChange : 0,
        weekChange: 0, // Will be calculated differently for major chains
        monthChange: 0, // Will be calculated differently for major chains
        marketShare: (supply / totalSupply) * 100
      });
    });

    return flows
      .filter(flow => flow.currentSupply > 1000000) // Filter chains with >$1M
      .sort((a, b) => b.currentSupply - a.currentSupply)
      .slice(0, 15);
  }, [stablecoins]);

  // Prepare chart data
  const supplyChartData = useMemo(() => {
    return chainFlows.slice(0, 10).map(flow => ({
      name: flow.chain.length > 12 ? flow.chain.substring(0, 12) + '...' : flow.chain,
      supply: flow.currentSupply,
      marketShare: flow.marketShare
    }));
  }, [chainFlows]);

  const flowsChartData = useMemo(() => {
    return flowsData.slice(-30).map(flow => ({
      date: flow.date,
      supply: flow.totalCirculating.peggedUSD,
      volume: flow.totalCirculatingUSD.peggedUSD
    }));
  }, [flowsData]);

  if (loading) {
    return <LoadingCard title="💰 Token Supply & Flows" />;
  }

  if (error) {
    return <ErrorCard title="💰 Token Supply & Flows" error={error} />;
  }

  const totalStablecoinSupply = stablecoins.reduce((sum, coin) => sum + coin.circulating.peggedUSD, 0);
  const top5Chains = chainFlows.slice(0, 5);
  const totalDayChange = stablecoins.reduce((sum, coin) => {
    const current = coin.circulating.peggedUSD;
    const prev = coin.circulatingPrevDay.peggedUSD;
    return sum + (current - prev);
  }, 0);

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
            <span className="text-lg">💰</span>
            Token Supply & Flows
          </h3>
          <p className="text-gray-300 text-xs">
            Stablecoin supply, cross-chain flows, and market movements
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedChain}
            onChange={(e) => setSelectedChain(e.target.value)}
            className="bg-gray-800 text-white px-3 py-1 rounded border border-gray-700 text-sm"
          >
            <option value="ethereum">Ethereum</option>
            <option value="solana">Solana</option>
            <option value="polygon">Polygon</option>
            <option value="bsc">BSC</option>
            <option value="arbitrum">Arbitrum</option>
          </select>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
            className="bg-gray-800 text-white px-3 py-1 rounded border border-gray-700 text-sm"
          >
            <option value="7d">7 Days</option>
            <option value="30d">30 Days</option>
            <option value="90d">90 Days</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Total Stablecoin Supply</div>
          <div className="text-white text-lg font-bold">{formatNumber(totalStablecoinSupply)}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">24h Net Flow</div>
          <div className={`text-lg font-bold ${totalDayChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalDayChange >= 0 ? '+' : ''}{formatNumber(totalDayChange)}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Active Chains</div>
          <div className="text-white text-lg font-bold">{chainFlows.length}</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-gray-400 text-sm">Top Chain Share</div>
          <div className="text-white text-lg font-bold">
            {top5Chains.length > 0 ? `${top5Chains[0].marketShare.toFixed(1)}%` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Supply by Chain */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-4 text-sm">Stablecoin Supply by Chain</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={supplyChartData}>
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
                formatter={(value: number) => [formatNumber(value), 'Supply']}
                labelStyle={{ color: '#fff' }}
                {...commonChartConfig.tooltip}
              />
              <Bar dataKey="supply" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Flows Over Time */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-4 text-sm">
            {selectedChain.charAt(0).toUpperCase() + selectedChain.slice(1)} Stablecoin Flows
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={flowsChartData}>
              <CartesianGrid {...commonChartConfig.grid} />
              <XAxis
                dataKey="date"
                {...commonChartConfig.axis}
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
              />
              <YAxis
                {...commonChartConfig.axis}
                tickFormatter={formatNumber}
              />
              <Tooltip
                formatter={(value: number) => [formatNumber(value), 'Supply']}
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                {...commonChartConfig.tooltip}
              />
              <Line
                type="monotone"
                dataKey="supply"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chain Flows Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-4 text-gray-300 font-medium text-sm">Rank</th>
                <th className="text-left p-4 text-gray-300 font-medium text-sm">Chain</th>
                <th className="text-right p-4 text-gray-300 font-medium text-sm">Supply</th>
                <th className="text-right p-4 text-gray-300 font-medium text-sm">24h Change</th>
                <th className="text-right p-4 text-gray-300 font-medium text-sm">Market Share</th>
                <th className="text-center p-4 text-gray-300 font-medium text-sm">Flow</th>
              </tr>
            </thead>
            <tbody>
              {chainFlows.slice(0, 12).map((flow, index) => (
                <tr key={flow.chain} className="border-b border-gray-700 hover:bg-gray-750">
                  <td className="p-4">
                    <div className="text-gray-400 text-sm font-mono w-6">
                      {index + 1}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="text-white font-medium text-sm">{flow.chain}</div>
                        <div className="text-gray-400 text-xs">
                          {flow.marketShare.toFixed(2)}% of total
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="text-white font-medium">
                      {formatNumber(flow.currentSupply)}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className={`font-medium ${
                      flow.dayChange >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {flow.dayChange >= 0 ? '+' : ''}{flow.dayChange.toFixed(2)}%
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="text-gray-300">
                      {flow.marketShare.toFixed(2)}%
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <div className={`text-xl ${
                      flow.dayChange >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {flow.dayChange >= 0 ? '📈' : '📉'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-center">
        <p className="text-gray-500 text-xs">
          Data powered by DeFiLlama Stablecoins API • Updated in real-time • Showing supply flows across {chainFlows.length} chains
        </p>
      </div>
    </div>
  );
}