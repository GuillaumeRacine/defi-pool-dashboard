/**
 * Simple test page to verify React is working
 */

'use client';

import { useState, useEffect } from 'react';

export default function TestPage() {
  const [mounted, setMounted] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log('✅ Test page mounted and useEffect ran');
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          DeFi Dashboard Test Page
        </h1>
        
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Component Status</h2>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${mounted ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>Component Mounted: {mounted ? 'Yes' : 'No'}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Environment Keys Available: {typeof window !== 'undefined' ? 'Client-side' : 'Server-side'}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setCount(count + 1)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Click Count: {count}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border mt-6">
          <h2 className="text-xl font-semibold mb-4">Mock Pool Data</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: 'ETH-USDC', tvl: '$150M', apy: '12.5%', chain: 'ethereum' },
              { name: 'SOL-USDC', tvl: '$45M', apy: '18.2%', chain: 'solana' },
              { name: 'WETH-USDC', tvl: '$25M', apy: '15.8%', chain: 'base' }
            ].map((pool, i) => (
              <div key={i} className="bg-gray-50 p-4 rounded border">
                <h3 className="font-semibold text-gray-900 mb-2">{pool.name}</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>TVL: {pool.tvl}</div>
                  <div>APY: {pool.apy}</div>
                  <div>Chain: {pool.chain}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-200">
          <p className="text-blue-800">
            ✅ If you can see this page with interactive elements, React is working correctly.
            The issue is likely in the main page's data loading logic.
          </p>
        </div>
      </div>
    </div>
  );
}