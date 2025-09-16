/**
 * Main Dashboard - Live Token Prices & High TVL Pools
 */

'use client';

import Link from 'next/link';
import TokenPricesSection from '@/components/TokenPricesSection';
import CacheStatus from '@/components/CacheStatus';
import CachePreloader from '@/components/CachePreloader';
import ChainAnalytics from '@/components/ChainAnalytics';
import ProtocolInsights from '@/components/ProtocolInsights';
import MarketIntelligence from '@/components/MarketIntelligence';

export default function HomePage() {

  return (
    <div className="min-h-screen bg-black">
      {/* Preload cache in background */}
      <CachePreloader />
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">
                DeFi Dashboard
              </h1>
              <p className="text-gray-300 text-sm">
                Live token prices with historical CAGR analysis
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Powered by</p>
              <p className="text-sm font-semibold text-blue-400">DefiLlama API</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Cache Status */}
        <div className="mb-6">
          <CacheStatus />
        </div>

        {/* Token Prices Section */}
        <TokenPricesSection />


        {/* Advanced Analytics Sections */}
        <div className="mt-8 space-y-8">
          <ChainAnalytics />
          <ProtocolInsights />
          <MarketIntelligence />
        </div>

        {/* Navigation Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* DEX Analysis Navigation */}
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <span className="text-2xl">🔄</span>
              DEX Analysis
            </h3>
            <p className="text-gray-300 mb-4 text-sm">
              Comprehensive DEX protocol analysis with volume, fees, and TVL historical charts
            </p>
            <Link
              href="/dexs"
              className="inline-flex items-center gap-2 bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition-colors text-sm"
            >
              Analyze DEXs
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Protocols Navigation */}
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <span className="text-2xl">🏛️</span>
              Protocol Analysis
            </h3>
            <p className="text-gray-300 mb-4 text-sm">
              Deep dive into DeFi protocols with comprehensive data, category filtering, and security analysis
            </p>
            <Link
              href="/protocols"
              className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              Explore Protocols
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {/* Pools Navigation */}
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <span className="text-2xl">🏊</span>
              High TVL Pools
            </h3>
            <p className="text-gray-300 mb-4 text-sm">
              Discover liquidity pools with high total value locked, APY analysis, and historical performance
            </p>
            <Link
              href="/pools"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              View All Pools
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}