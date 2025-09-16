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

export default function HomePage() {

  return (
    <div className="min-h-screen bg-black">
      {/* Preload cache in background */}
      <CachePreloader />
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-lg font-bold text-white">
                DeFi Dashboard
              </h1>
              <p className="text-gray-300 text-xs">
                Live token prices with historical CAGR analysis
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Powered by</p>
              <p className="text-xs font-semibold text-blue-400">DefiLlama API</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Token Prices Section */}
        <TokenPricesSection />


        {/* Advanced Analytics Sections */}
        <div className="mt-8 space-y-8">
          <ChainAnalytics />
          <ProtocolInsights />
        </div>
      </div>
    </div>
  );
}