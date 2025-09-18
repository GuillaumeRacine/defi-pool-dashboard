'use client';

import { useState, useEffect, useMemo } from 'react';
import { defiLlamaAPI } from '@/lib/defi-api';

interface PoolAnalytics {
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
  apyMean30d?: number;
  stablecoin?: boolean;
  mu?: number;
  sigma?: number;
  volumeUsd1d?: number;
  volumeUsd7d?: number;
  predictions?: {
    predictedClass?: string;
    predictedProbability?: number;
    binnedConfidence?: number;
  };
  outlier?: boolean;
}

interface OpportunityScore {
  pool: PoolAnalytics;
  riskAdjustedRatio: number;
  stabilityScore: number;
  momentumScore: number;
  efficiencyRatio: number;
  overallScore: number;
  riskCategory: 'Low' | 'Medium' | 'High';
  recommendationLevel: 'Conservative' | 'Moderate' | 'Aggressive';
}

export default function YieldOpportunityScanner() {
  const [pools, setPools] = useState<PoolAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minTVL, setMinTVL] = useState(5000000); // $5M minimum for quality
  const [riskTolerance, setRiskTolerance] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate');
  const [showOnlyPredicted, setShowOnlyPredicted] = useState(false);

  useEffect(() => {
    loadOpportunities();
  }, [minTVL]);

  const loadOpportunities = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await defiLlamaAPI.getHighTVLPools(minTVL);
      if (response.error) {
        throw new Error(response.error);
      }

      if (response.data) {
        // Filter for pools with required analytics data
        const analyticalPools = response.data.filter((pool: any) => 
          pool.apy && 
          pool.mu && 
          pool.sigma && 
          pool.tvlUsd >= minTVL
        );
        setPools(analyticalPools);
      }
    } catch (err) {
      console.error('Failed to load yield opportunities:', err);
      setError(err instanceof Error ? err.message : 'Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  };

  // Calculate comprehensive opportunity scores
  const scoredOpportunities = useMemo(() => {
    return pools.map((pool): OpportunityScore => {
      // 1. Risk-Adjusted Yield Ranking (μ/σ ratio)
      const riskAdjustedRatio = (pool.mu && pool.sigma && pool.sigma > 0) 
        ? pool.mu / pool.sigma 
        : 0;

      // 2. ML Stability Score (from predictions)
      const stabilityScore = pool.predictions?.predictedClass === 'Stable/Up' 
        ? (pool.predictions.predictedProbability || 0) / 100
        : pool.predictions?.predictedClass === 'Stable/Down'
        ? 0.5
        : 0.3; // Default for volatile/unknown

      // 3. APY Momentum Score (trend strength)
      const momentum1d = pool.apyPct1D || 0;
      const momentum7d = pool.apyPct7D || 0;
      const momentum30d = pool.apyPct30D || 0;
      
      // Weighted momentum (recent changes matter more)
      const momentumScore = (
        momentum1d * 0.5 + 
        momentum7d * 0.3 + 
        momentum30d * 0.2
      ) / 100; // Normalize to 0-1 scale

      // 4. Volume-to-TVL Efficiency Ratio
      const volumeRatio = (pool.volumeUsd1d && pool.tvlUsd) 
        ? pool.volumeUsd1d / pool.tvlUsd 
        : 0;
      const efficiencyRatio = Math.min(volumeRatio, 1); // Cap at 100%

      // 5. Overall Score Calculation
      const baseAPY = (pool.apy || 0) / 100; // Normalize APY
      const overallScore = (
        riskAdjustedRatio * 0.3 +    // 30% - Risk-adjusted returns
        stabilityScore * 0.25 +       // 25% - ML stability prediction
        baseAPY * 0.25 +              // 25% - Raw APY
        momentumScore * 0.1 +         // 10% - Momentum
        efficiencyRatio * 0.1         // 10% - Efficiency
      );

      // Risk categorization
      const riskCategory: 'Low' | 'Medium' | 'High' = 
        (pool.sigma || 0) < 0.05 ? 'Low' :
        (pool.sigma || 0) < 0.15 ? 'Medium' : 'High';

      // Recommendation based on risk tolerance and scores
      const recommendationLevel: 'Conservative' | 'Moderate' | 'Aggressive' = 
        riskCategory === 'Low' && stabilityScore > 0.7 ? 'Conservative' :
        riskCategory === 'Medium' && overallScore > 0.5 ? 'Moderate' : 'Aggressive';

      return {
        pool,
        riskAdjustedRatio,
        stabilityScore,
        momentumScore,
        efficiencyRatio,
        overallScore,
        riskCategory,
        recommendationLevel
      };
    })
    .sort((a, b) => b.overallScore - a.overallScore); // Best opportunities first
  }, [pools]);

  // Filter opportunities based on user preferences
  const filteredOpportunities = useMemo(() => {
    return scoredOpportunities.filter(opp => {
      // Risk tolerance filter
      if (riskTolerance === 'conservative' && opp.riskCategory === 'High') return false;
      if (riskTolerance === 'moderate' && opp.riskCategory === 'High' && opp.stabilityScore < 0.6) return false;
      
      // ML prediction filter
      if (showOnlyPredicted && !opp.pool.predictions?.predictedClass) return false;
      
      return true;
    });
  }, [scoredOpportunities, riskTolerance, showOnlyPredicted]);

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatAPY = (apy?: number) => {
    if (!apy) return '-';
    return `${apy.toFixed(2)}%`;
  };

  const formatTVL = (tvl: number) => {
    if (tvl >= 1e9) return `$${(tvl / 1e9).toFixed(2)}B`;
    if (tvl >= 1e6) return `$${(tvl / 1e6).toFixed(2)}M`;
    if (tvl >= 1e3) return `$${(tvl / 1e3).toFixed(2)}K`;
    return `$${tvl.toFixed(2)}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.7) return 'text-green-400';
    if (score >= 0.5) return 'text-yellow-400';
    if (score >= 0.3) return 'text-orange-400';
    return 'text-red-400';
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'bg-green-900 text-green-300 border-green-600';
      case 'Medium': return 'bg-yellow-900 text-yellow-300 border-yellow-600';
      case 'High': return 'bg-red-900 text-red-300 border-red-600';
      default: return 'bg-gray-900 text-gray-300 border-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
        <h2 className="text-xl font-bold text-white mb-4">🎯 Yield Opportunity Scanner</h2>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-lg h-20"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
        <h2 className="text-xl font-bold text-white mb-4">🎯 Yield Opportunity Scanner</h2>
        <div className="bg-red-900 border border-red-700 rounded-lg p-4">
          <p className="text-red-200">{error}</p>
          <button
            onClick={loadOpportunities}
            className="mt-2 bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">🎯 Yield Opportunity Scanner</h2>
        <div className="text-sm text-gray-400">
          {filteredOpportunities.length} opportunities analyzed
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Risk Tolerance</label>
            <select
              value={riskTolerance}
              onChange={(e) => setRiskTolerance(e.target.value as any)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            >
              <option value="conservative">Conservative</option>
              <option value="moderate">Moderate</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Minimum TVL</label>
            <select
              value={minTVL}
              onChange={(e) => setMinTVL(Number(e.target.value))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            >
              <option value={1000000}>≥ $1M</option>
              <option value={5000000}>≥ $5M</option>
              <option value={10000000}>≥ $10M</option>
              <option value={50000000}>≥ $50M</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showOnlyPredicted}
                onChange={(e) => setShowOnlyPredicted(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-300">ML Predictions Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Opportunity Cards */}
      <div className="space-y-4">
        {filteredOpportunities.slice(0, 20).map((opportunity, index) => (
          <div key={opportunity.pool.pool} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              
              {/* Pool Info */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-white">#{index + 1}</span>
                  <span className="font-medium text-gray-200">{opportunity.pool.symbol}</span>
                  <span className={`px-2 py-1 rounded text-xs border ${getRiskBadgeColor(opportunity.riskCategory)}`}>
                    {opportunity.riskCategory} Risk
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  {opportunity.pool.project} • {opportunity.pool.chain}
                </div>
                <div className="text-xs text-gray-300 mt-1">
                  TVL: {formatTVL(opportunity.pool.tvlUsd)}
                </div>
              </div>

              {/* Scores */}
              <div>
                <div className="text-sm font-medium text-gray-300 mb-2">Analytics Scores</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Overall Score:</span>
                    <span className={`font-medium ${getScoreColor(opportunity.overallScore)}`}>
                      {(opportunity.overallScore * 100).toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Risk-Adj Ratio:</span>
                    <span className="text-gray-200">{opportunity.riskAdjustedRatio.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Stability:</span>
                    <span className={`font-medium ${getScoreColor(opportunity.stabilityScore)}`}>
                      {formatPercentage(opportunity.stabilityScore)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Efficiency:</span>
                    <span className="text-gray-200">{formatPercentage(opportunity.efficiencyRatio)}</span>
                  </div>
                </div>
              </div>

              {/* APY & Performance */}
              <div>
                <div className="text-sm font-medium text-gray-300 mb-2">Yield Performance</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Current APY:</span>
                    <span className="text-white font-medium">{formatAPY(opportunity.pool.apy)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">30D Mean:</span>
                    <span className="text-gray-200">{formatAPY(opportunity.pool.apyMean30d)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">1D Change:</span>
                    <span className={opportunity.pool.apyPct1D && opportunity.pool.apyPct1D >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {opportunity.pool.apyPct1D ? `${opportunity.pool.apyPct1D.toFixed(2)}%` : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">7D Change:</span>
                    <span className={opportunity.pool.apyPct7D && opportunity.pool.apyPct7D >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {opportunity.pool.apyPct7D ? `${opportunity.pool.apyPct7D.toFixed(2)}%` : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ML Predictions & Stats */}
              <div>
                <div className="text-sm font-medium text-gray-300 mb-2">Risk Analytics</div>
                <div className="space-y-1 text-xs">
                  {opportunity.pool.predictions && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-400">ML Prediction:</span>
                        <span className="text-gray-200">{opportunity.pool.predictions.predictedClass}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Confidence:</span>
                        <span className="text-gray-200">{opportunity.pool.predictions.predictedProbability}%</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Volatility (σ):</span>
                    <span className="text-gray-200">{opportunity.pool.sigma?.toFixed(4) || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Recommendation:</span>
                    <span className={`font-medium ${
                      opportunity.recommendationLevel === 'Conservative' ? 'text-green-400' :
                      opportunity.recommendationLevel === 'Moderate' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {opportunity.recommendationLevel}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredOpportunities.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400 mb-4">No opportunities match your current criteria</p>
          <button
            onClick={() => {
              setRiskTolerance('aggressive');
              setShowOnlyPredicted(false);
              setMinTVL(1000000);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reset Filters
          </button>
        </div>
      )}

      <div className="mt-6 text-xs text-gray-500 text-center">
        Scores calculated from risk-adjusted returns, ML predictions, momentum, and efficiency metrics
      </div>
    </div>
  );
}