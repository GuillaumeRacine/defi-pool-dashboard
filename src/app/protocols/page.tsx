/**
 * Protocols Page - Comprehensive Protocol Analysis
 * Dedicated page for browsing and analyzing DeFi protocols
 */

'use client';

import Link from 'next/link';
import ProtocolDashboard from '@/components/ProtocolDashboard';

export default function ProtocolsPage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <Link
                  href="/"
                  className="text-blue-400 hover:text-blue-300 flex items-center gap-2 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Dashboard
                </Link>
              </div>
              <h1 className="text-2xl font-bold text-white">
                Protocol Analysis
              </h1>
              <p className="text-gray-300 text-sm">
                Comprehensive analysis of DeFi protocols across all chains and categories
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
        {/* Protocol Dashboard */}
        <ProtocolDashboard />
      </div>
    </div>
  );
}