'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

interface MarketMetric {
  name: string;
  current: number;
  change24h: number;
  change7d: number;
  trend: 'up' | 'down' | 'stable';
  significance: 'high' | 'medium' | 'low';
}

interface CorrelationData {
  asset1: string;
  asset2: string;
  correlation: number;
  strength: 'strong' | 'moderate' | 'weak';
}

interface SentimentData {
  source: string;
  sentiment: number;
  volume: number;
  impact: 'bullish' | 'bearish' | 'neutral';
}

interface MarketRegimeData {
  period: string;
  volatility: number;
  momentum: number;
  liquidity: number;
  sentiment: number;
  riskAppetite: number;
}

export default function MarketIntelligence() {
  const [marketMetrics, setMarketMetrics] = useState<MarketMetric[]>([]);
  const [correlations, setCorrelations] = useState<CorrelationData[]>([]);
  const [sentimentData, setSentimentData] = useState<SentimentData[]>([]);
  const [regimeHistory, setRegimeHistory] = useState<MarketRegimeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'24h' | '7d' | '30d'>('7d');
  const [alertLevel, setAlertLevel] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => {
    loadMarketIntelligence();
  }, []);

  const loadMarketIntelligence = async () => {
    try {
      setLoading(true);
      
      // Simulated comprehensive market intelligence data
      const mockMarketMetrics: MarketMetric[] = [
        { name: 'Total Market TVL', current: 319000000000, change24h: 2.3, change7d: 8.7, trend: 'up', significance: 'high' },
        { name: 'DeFi Dominance', current: 65.4, change24h: -0.2, change7d: 1.4, trend: 'stable', significance: 'high' },
        { name: 'Active Users (24h)', current: 487523, change24h: 12.1, change7d: 18.9, trend: 'up', significance: 'medium' },
        { name: 'Cross-Chain Volume', current: 2340000000, change24h: 5.6, change7d: -3.2, trend: 'down', significance: 'medium' },
        { name: 'Stablecoin Supply', current: 156000000000, change24h: 0.8, change7d: 2.1, trend: 'up', significance: 'high' },
        { name: 'DEX/CEX Volume Ratio', current: 0.47, change24h: 3.4, change7d: 7.8, trend: 'up', significance: 'medium' },
        { name: 'Liquidation Volume', current: 45000000, change24h: -23.4, change7d: -45.6, trend: 'down', significance: 'low' },
        { name: 'New Protocol Launches', current: 12, change24h: 0, change7d: 20.0, trend: 'up', significance: 'low' },
      ];

      const mockCorrelations: CorrelationData[] = [
        { asset1: 'ETH', asset2: 'BTC', correlation: 0.87, strength: 'strong' },
        { asset1: 'SOL', asset2: 'ETH', correlation: 0.72, strength: 'strong' },
        { asset1: 'AVAX', asset2: 'SOL', correlation: 0.68, strength: 'moderate' },
        { asset1: 'MATIC', asset2: 'ETH', correlation: 0.64, strength: 'moderate' },
        { asset1: 'UNI', asset2: 'ETH', correlation: 0.59, strength: 'moderate' },
        { asset1: 'AAVE', asset2: 'UNI', correlation: 0.45, strength: 'weak' },
        { asset1: 'LINK', asset2: 'BTC', correlation: 0.41, strength: 'weak' },
        { asset1: 'MKR', asset2: 'ETH', correlation: 0.38, strength: 'weak' },
      ];

      const mockSentimentData: SentimentData[] = [
        { source: 'Social Media', sentiment: 72, volume: 145234, impact: 'bullish' },
        { source: 'News Articles', sentiment: 68, volume: 892, impact: 'bullish' },
        { source: 'Developer Activity', sentiment: 78, volume: 1247, impact: 'bullish' },
        { source: 'Institutional Flow', sentiment: 45, volume: 23, impact: 'bearish' },
        { source: 'On-Chain Metrics', sentiment: 82, volume: 50000, impact: 'bullish' },
        { source: 'Options Flow', sentiment: 38, volume: 8934, impact: 'bearish' },
      ];

      const mockRegimeHistory: MarketRegimeData[] = Array.from({ length: 30 }, (_, i) => {
        const baseDate = new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000);
        return {
          period: baseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          volatility: Math.random() * 40 + 20,
          momentum: Math.random() * 60 + 20,
          liquidity: Math.random() * 30 + 50,
          sentiment: Math.random() * 50 + 30,
          riskAppetite: Math.random() * 40 + 30,
        };
      });

      setMarketMetrics(mockMarketMetrics);
      setCorrelations(mockCorrelations);
      setSentimentData(mockSentimentData);
      setRegimeHistory(mockRegimeHistory);
    } catch (error) {
      console.error('Failed to load market intelligence:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: number, type: string): string => {
    if (type === 'currency') {
      if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
      if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
      if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
      return `$${value.toFixed(2)}`;
    }
    if (type === 'percentage') return `${value.toFixed(1)}%`;
    if (type === 'number') return value.toLocaleString();
    if (type === 'ratio') return value.toFixed(2);
    return value.toString();
  };

  const formatChange = (change: number): string => {
    const color = change >= 0 ? 'text-green-400' : 'text-red-400';
    const sign = change >= 0 ? '+' : '';
    return `<span class="${color}">${sign}${change.toFixed(1)}%</span>`;
  };

  const getMetricType = (name: string): string => {
    if (name.includes('TVL') || name.includes('Volume') || name.includes('Supply')) return 'currency';
    if (name.includes('Dominance') || name.includes('Ratio')) return 'percentage';
    if (name.includes('Users') || name.includes('Launches')) return 'number';
    return 'ratio';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'stable': return '➡️';
      default: return '❓';
    }
  };

  const getSignificanceColor = (significance: string) => {
    switch (significance) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getCorrelationColor = (correlation: number) => {
    const abs = Math.abs(correlation);
    if (abs >= 0.7) return 'text-red-400';
    if (abs >= 0.5) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment >= 70) return 'text-green-400';
    if (sentiment >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const currentRegime = regimeHistory[regimeHistory.length - 1];

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
          <h2 className="text-xl font-bold text-white">Market Intelligence & Analysis</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedTimeframe('24h')}
              className={`px-3 py-1 rounded text-sm ${selectedTimeframe === '24h' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              24H
            </button>
            <button
              onClick={() => setSelectedTimeframe('7d')}
              className={`px-3 py-1 rounded text-sm ${selectedTimeframe === '7d' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              7D
            </button>
            <button
              onClick={() => setSelectedTimeframe('30d')}
              className={`px-3 py-1 rounded text-sm ${selectedTimeframe === '30d' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              30D
            </button>
          </div>
        </div>

        {/* Market Regime Radar Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Current Market Regime</h3>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={[currentRegime]}>
                <PolarGrid />
                <PolarAngleAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} />
                <PolarRadiusAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} domain={[0, 100]} />
                <Radar
                  name="Current"
                  dataKey="volatility"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.1}
                />
                <Radar
                  name="Momentum"
                  dataKey="momentum"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.1}
                />
                <Radar
                  name="Liquidity"
                  dataKey="liquidity"
                  stroke="#F59E0B"
                  fill="#F59E0B"
                  fillOpacity={0.1}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Sentiment Analysis */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Market Sentiment Sources</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sentimentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="source" tick={{ fill: '#9CA3AF', fontSize: 9 }} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 10 }} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  formatter={(value: number) => [`${value}%`, 'Sentiment Score']}
                />
                <Bar dataKey="sentiment" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Key Market Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {marketMetrics.slice(0, 4).map((metric) => (
            <div key={metric.name} className="p-4 bg-gray-900 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-400">{metric.name}</div>
                <div className="flex items-center gap-1">
                  <span className={getSignificanceColor(metric.significance)} title={`${metric.significance} significance`}>
                    ●
                  </span>
                  <span>{getTrendIcon(metric.trend)}</span>
                </div>
              </div>
              <div className="text-lg font-bold text-white">
                {formatValue(metric.current, getMetricType(metric.name))}
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span dangerouslySetInnerHTML={{ __html: formatChange(metric.change24h) }} />
                <span className="text-gray-500">24h</span>
              </div>
              <div className="flex justify-between text-xs">
                <span dangerouslySetInnerHTML={{ __html: formatChange(metric.change7d) }} />
                <span className="text-gray-500">7d</span>
              </div>
            </div>
          ))}
        </div>

        {/* Market Metrics Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-gray-300">Metric</th>
                <th className="px-4 py-3 text-right text-gray-300">Current Value</th>
                <th className="px-4 py-3 text-right text-gray-300">24h Change</th>
                <th className="px-4 py-3 text-right text-gray-300">7d Change</th>
                <th className="px-4 py-3 text-center text-gray-300">Trend</th>
                <th className="px-4 py-3 text-center text-gray-300">Significance</th>
              </tr>
            </thead>
            <tbody>
              {marketMetrics.map((metric, index) => (
                <tr key={index} className="border-b border-gray-700 hover:bg-gray-750">
                  <td className="px-4 py-3 font-medium text-white">{metric.name}</td>
                  <td className="px-4 py-3 text-right text-gray-300 font-mono">
                    {formatValue(metric.current, getMetricType(metric.name))}
                  </td>
                  <td className="px-4 py-3 text-right" dangerouslySetInnerHTML={{ __html: formatChange(metric.change24h) }} />
                  <td className="px-4 py-3 text-right" dangerouslySetInnerHTML={{ __html: formatChange(metric.change7d) }} />
                  <td className="px-4 py-3 text-center">{getTrendIcon(metric.trend)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={getSignificanceColor(metric.significance)} title={`${metric.significance} impact`}>
                      {metric.significance}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Correlation Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Asset Correlations</h3>
            <div className="space-y-2">
              {correlations.slice(0, 6).map((corr, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                  <div className="text-sm text-white">{corr.asset1} ↔ {corr.asset2}</div>
                  <div className="flex items-center gap-2">
                    <span className={getCorrelationColor(corr.correlation)}>
                      {corr.correlation.toFixed(2)}
                    </span>
                    <span className="text-xs text-gray-500">{corr.strength}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Sentiment Breakdown</h3>
            <div className="space-y-3">
              {sentimentData.map((sentiment, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                  <div>
                    <div className="text-sm text-white">{sentiment.source}</div>
                    <div className="text-xs text-gray-500">{sentiment.volume.toLocaleString()} signals</div>
                  </div>
                  <div className="text-right">
                    <div className={getSentimentColor(sentiment.sentiment)}>
                      {sentiment.sentiment}%
                    </div>
                    <div className={`text-xs ${sentiment.impact === 'bullish' ? 'text-green-400' : sentiment.impact === 'bearish' ? 'text-red-400' : 'text-gray-400'}`}>
                      {sentiment.impact}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Market Alerts */}
        <div className="mt-6 p-4 bg-gray-900 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-300">Market Intelligence Alerts</h3>
            <select
              value={alertLevel}
              onChange={(e) => setAlertLevel(e.target.value as 'low' | 'medium' | 'high')}
              className="px-2 py-1 rounded text-xs bg-gray-700 text-gray-300 border border-gray-600"
            >
              <option value="low">All Alerts</option>
              <option value="medium">Medium+ Only</option>
              <option value="high">High Priority Only</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-yellow-900/20 border border-yellow-600 rounded">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-yellow-400">⚠️</span>
                <span className="text-sm font-medium text-yellow-400">Correlation Alert</span>
              </div>
              <div className="text-xs text-gray-300">ETH-BTC correlation at 0.87, highest in 30 days</div>
            </div>
            <div className="p-3 bg-green-900/20 border border-green-600 rounded">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-green-400">📈</span>
                <span className="text-sm font-medium text-green-400">Growth Signal</span>
              </div>
              <div className="text-xs text-gray-300">Active users growing 18.9% week-over-week</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}