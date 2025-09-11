/**
 * Simplified homepage for debugging
 */

'use client';

import { useState } from 'react';

// Mock data directly in component
const mockPools = [
  {
    id: 'ethereum:0x1234',
    name: 'ETH-USDC',
    protocol: 'uniswap-v3',
    chain: 'ethereum',
    tvl: 150000000,
    apy: 12.5,
    quality: 94
  },
  {
    id: 'solana:5678',
    name: 'SOL-USDC', 
    protocol: 'orca',
    chain: 'solana',
    tvl: 45000000,
    apy: 18.2,
    quality: 91
  },
  {
    id: 'base:9999',
    name: 'WETH-USDC',
    protocol: 'aerodrome',
    chain: 'base', 
    tvl: 25000000,
    apy: 15.8,
    quality: 88
  }
];

export default function SimpleHomePage() {
  const [pools] = useState(mockPools);

  const formatTVL = (tvl: number) => {
    if (tvl >= 1e9) return `$${(tvl / 1e9).toFixed(2)}B`;
    if (tvl >= 1e6) return `$${(tvl / 1e6).toFixed(2)}M`;
    if (tvl >= 1e3) return `$${(tvl / 1e3).toFixed(2)}K`;
    return `$${tvl.toFixed(2)}`;
  };

  const getQualityColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 80) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                DeFi Liquidity Pool Dashboard
              </h1>
              <p className="text-gray-600 mt-2">
                Historical analysis of yield farming opportunities across multiple chains
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Powered by</p>
              <p className="text-lg font-semibold text-blue-600">DefiLlama API</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total Pools</h3>
            <p className="text-2xl font-bold text-gray-900">{pools.length}</p>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Total TVL</h3>
            <p className="text-2xl font-bold text-gray-900">
              {formatTVL(pools.reduce((sum, pool) => sum + pool.tvl, 0))}
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Avg. Quality Score</h3>
            <p className="text-2xl font-bold text-gray-900">
              {(pools.reduce((sum, pool) => sum + pool.quality, 0) / pools.length).toFixed(1)}/100
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Active Chains</h3>
            <p className="text-2xl font-bold text-gray-900">
              {new Set(pools.map(p => p.chain)).size}
            </p>
          </div>
        </div>

        {/* Pool Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pools.map((pool) => (
            <div key={pool.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {pool.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {pool.protocol} • {pool.chain}
                  </p>
                </div>
                
                {/* Quality Score Badge */}
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getQualityColor(pool.quality)}`}>
                  Quality: {pool.quality}/100
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Total Value Locked</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {formatTVL(pool.tvl)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">APY</p>
                  <p className="text-xl font-semibold text-green-600">
                    {pool.apy.toFixed(2)}%
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button className="flex-1 bg-blue-600 text-white text-center py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                  View Details
                </button>
                <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              </div>

              {/* Data Sources */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  Sources: defillama (mock data)
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-green-50 rounded border border-green-200">
          <p className="text-green-800">
            ✅ <strong>Success!</strong> This simplified version shows that React and the UI components are working correctly. 
            The issue with the main page is in the async data loading logic.
          </p>
        </div>
      </div>
    </div>
  );
}