/**
 * Token Prices Section Component
 * Real-time feed with automatic refresh every 15 minutes
 * Compact single-line format for efficient data display
 */

'use client';

import { useState, useEffect } from 'react';
import { defiLlamaAPI, TokenPrice, TokenHistoricalPoint } from '@/lib/defi-api';
import TokenChart from './TokenChart';

interface TokenWithHistory extends TokenPrice {
  marketCap?: number;
}

const TOP_TOKENS = ['BTC', 'ETH', 'SOL', 'SUI'];
const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds

export default function TokenPricesSection() {
  const [tokens, setTokens] = useState<{ [key: string]: TokenWithHistory }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nextUpdate, setNextUpdate] = useState<Date | null>(null);
  const [expandedToken, setExpandedToken] = useState<string | null>(null);

  useEffect(() => {
    loadTokenData();
    // Refresh every 15 minutes
    const interval = setInterval(loadTokenData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const loadTokenData = async () => {
    try {
      if (loading) {
        setError(null);
      }

      // Get current prices
      const pricesResponse = await defiLlamaAPI.getTokenPrices(TOP_TOKENS);
      if (pricesResponse.error) {
        throw new Error(pricesResponse.error);
      }

      const tokensWithHistory: { [key: string]: TokenWithHistory } = {};

      // Only process tokens if we have price data
      if (pricesResponse.data) {
        // For each token, just get the price data
        for (const tokenSymbol of TOP_TOKENS) {
          const tokenPrice = pricesResponse.data[tokenSymbol];
          if (!tokenPrice) {
            console.warn(`No price data available for ${tokenSymbol}`);
            continue;
          }

          // Generate mock market cap data for demo (in billions)
          const mockMarketCaps: { [key: string]: number } = {
            'BTC': 2260, // ~$2.26T
            'ETH': 531,  // ~$531B
            'SOL': 108,  // ~$108B
            'SUI': 10.4  // ~$10.4B
          };

          tokensWithHistory[tokenSymbol] = {
            ...tokenPrice,
            marketCap: mockMarketCaps[tokenSymbol] || 0
          };
        }
      }

      setTokens(tokensWithHistory);
      const now = new Date();
      setLastUpdated(now);
      setNextUpdate(new Date(now.getTime() + REFRESH_INTERVAL));
      setError(null);
    } catch (err) {
      console.error('Failed to load token data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load token data');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price?: number) => {
    if (price === undefined || price === null || !isFinite(price)) return '-';
    if (price >= 1000) {
      return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${price.toFixed(4)}`;
  };


  const getTokenIcon = (symbol: string) => {
    const icons: { [key: string]: string } = {
      'BTC': '₿',
      'ETH': 'Ξ',
      'SOL': '◎',
      'SUI': '🌊'
    };
    return icons[symbol] || '●';
  };

  const formatMarketCap = (marketCap?: number) => {
    console.log('Formatting market cap:', marketCap);
    if (!marketCap || !isFinite(marketCap) || marketCap === 0) return '-';
    if (marketCap >= 1000) return `$${(marketCap / 1000).toFixed(2)}T`;
    return `$${marketCap.toFixed(1)}B`;
  };

  const getTokenColor = (symbol: string) => {
    const colors: { [key: string]: string } = {
      'BTC': '#f7931a', // Bitcoin orange
      'ETH': '#627eea', // Ethereum blue
      'SOL': '#9945ff', // Solana purple  
      'SUI': '#4da2ff'  // Sui blue
    };
    return colors[symbol] || '#3B82F6';
  };

  if (loading && Object.keys(tokens).length === 0) {
    return (
      <section className="bg-gray-900 rounded-lg p-4 border border-gray-800 mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">Live Token Prices</h2>
        <div className="space-y-2">
          {TOP_TOKENS.map((token) => (
            <div key={token} className="animate-pulse bg-gray-800 h-8 rounded"></div>
          ))}
        </div>
      </section>
    );
  }

  if (error && Object.keys(tokens).length === 0) {
    return (
      <section className="bg-gray-900 rounded-lg p-4 border border-gray-800 mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">Live Token Prices</h2>
        <div className="bg-red-900 border border-red-700 rounded p-3">
          <p className="text-sm text-red-200">{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-gray-900 rounded-lg p-4 border border-gray-800 mb-6">
      {/* Header with status */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-white">Live Token Prices</h2>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {lastUpdated && (
            <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
          )}
          {nextUpdate && (
            <span>Next: {nextUpdate.toLocaleTimeString()}</span>
          )}
          <div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`} />
        </div>
      </div>

      {/* Table Header */}
      <div className="bg-gray-800 rounded-t-lg px-4 py-2 border border-gray-700 border-b-0">
        <div className="grid grid-cols-4 gap-4 text-xs font-medium text-gray-400 uppercase tracking-wide">
          <div>Token</div>
          <div className="text-right">Price</div>
          <div className="text-right">Market Cap</div>
          <div className="text-right">Chart</div>
        </div>
      </div>

      {/* Table Rows */}
      <div className="space-y-0">
        {TOP_TOKENS.map((tokenSymbol, index) => {
          const token = tokens[tokenSymbol];
          if (!token) return null;
          const isLast = index === TOP_TOKENS.length - 1;

          return (
            <div key={tokenSymbol}>
              {/* Table Row */}
              <div 
                className={`bg-gray-800 px-4 py-3 border-l border-r border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer ${
                  expandedToken === tokenSymbol ? 'border-b-0' : (isLast ? 'rounded-b-lg border-b' : 'border-b-0')
                }`}
                onClick={() => setExpandedToken(expandedToken === tokenSymbol ? null : tokenSymbol)}
              >
              <div className="grid grid-cols-4 gap-4 items-center text-sm">
                {/* Token info */}
                <div className="flex items-center gap-3">
                  <span className="text-lg">{getTokenIcon(tokenSymbol)}</span>
                  <div>
                    <div className="font-semibold text-white text-sm">{tokenSymbol}</div>
                    <div className="text-xs text-gray-400">{token.name}</div>
                  </div>
                </div>

                {/* Price */}
                <div className="text-right font-bold text-white">{formatPrice(token.price)}</div>
                
                {/* Market Cap */}
                <div className="text-right font-medium text-gray-300">{formatMarketCap(token.marketCap)}</div>
                
                {/* Chart indicator */}
                <div className="text-right">
                  <span className="text-blue-400 text-sm">
                    View Chart →
                  </span>
                </div>
                </div>
              </div>
              
              {/* Expanded Chart View */}
              {expandedToken === tokenSymbol && (
                <div className={`bg-gray-850 border-l border-r border-gray-700 px-6 py-6 ${
                  isLast ? 'rounded-b-lg border-b' : ''
                }`}>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-3">
                        <span className="text-2xl">{getTokenIcon(tokenSymbol)}</span>
                        {tokenSymbol} Historical Performance
                      </h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedToken(null);
                        }}
                        className="text-gray-400 hover:text-gray-200 p-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* Price Chart */}
                    <div className="grid grid-cols-1 gap-6">
                      <TokenChart
                        tokenSymbol={tokenSymbol}
                        title={`${token.name} Price History (All Time)`}
                        color={getTokenColor(tokenSymbol)}
                        days={365}
                      />
                    </div>
                    
                    {/* Additional Token Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                      {/* Current Metrics */}
                      <div className="space-y-3">
                        <h4 className="text-gray-300 font-semibold text-sm border-b border-gray-600 pb-1">Current Metrics</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-400 text-xs">Current Price:</span>
                            <span className="text-white text-xs font-medium">{formatPrice(token.price)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400 text-xs">Market Cap:</span>
                            <span className="text-gray-300 text-xs">{formatMarketCap(token.marketCap)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400 text-xs">Symbol:</span>
                            <span className="text-gray-300 text-xs">{token.symbol}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400 text-xs">Last Updated:</span>
                            <span className="text-gray-300 text-xs">
                              {lastUpdated ? lastUpdated.toLocaleTimeString() : '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Chart Info */}
                      <div className="space-y-3">
                        <h4 className="text-gray-300 font-semibold text-sm border-b border-gray-600 pb-1">Chart Details</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-400 text-xs">Time Range:</span>
                            <span className="text-gray-300 text-xs">365 Days</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400 text-xs">Data Points:</span>
                            <span className="text-gray-300 text-xs">Daily</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400 text-xs">Chart Type:</span>
                            <span className="text-gray-300 text-xs">Line Chart</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Data Sources */}
                      <div className="space-y-3">
                        <h4 className="text-gray-300 font-semibold text-sm border-b border-gray-600 pb-1">Data Sources</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-400 text-xs">Price Feed:</span>
                            <span className="text-gray-300 text-xs">DefiLlama</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400 text-xs">Data Provider:</span>
                            <span className="text-gray-300 text-xs">CoinGecko</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400 text-xs">Update Frequency:</span>
                            <span className="text-gray-300 text-xs">15 minutes</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400 text-xs">Status:</span>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-900 text-green-300">
                              Live
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-800 text-xs text-gray-500 text-center">
        Auto-refreshes every 15 minutes • Click tokens to view historical charts • Data provided by DefiLlama
      </div>
    </section>
  );
}