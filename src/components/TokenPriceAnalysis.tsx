'use client';

import React, { useState, useEffect } from 'react';
import { defiLlamaAPI } from '@/lib/defi-api';

interface TokenData {
  symbol: string;
  name: string;
  price: number;
  confidence: number;
  priceChange24h: number;
  marketCap?: number;
  volume24h?: number;
  chains: string[];
  chainPrices: { [chain: string]: number };
}

interface ProtocolTVLData {
  protocol: string;
  tvl: number;
  tvlChange24h: number;
  chains: string[];
  tokens: string[];
}

interface ArbitrageOpportunity {
  token: string;
  buyChain: string;
  sellChain: string;
  buyPrice: number;
  sellPrice: number;
  spread: number;
  spreadPercent: number;
  confidence: number;
}

export default function TokenPriceAnalysis() {
  const [tokens, setTokens] = useState<TokenData[]>([]);
  const [protocols, setProtocols] = useState<ProtocolTVLData[]>([]);
  const [arbitrageOpportunities, setArbitrageOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'price_performance' | 'arbitrage' | 'protocol_correlation'>('price_performance');
  const [minConfidence, setMinConfidence] = useState(0.7);
  const [minSpread, setMinSpread] = useState(1.0);

  useEffect(() => {
    loadTokenAnalysis();
  }, []);

  const loadTokenAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);

      // Simulate comprehensive token analysis data
      const mockTokens: TokenData[] = [
        {
          symbol: 'UNI',
          name: 'Uniswap',
          price: 8.42,
          confidence: 0.95,
          priceChange24h: 3.2,
          marketCap: 8420000000,
          volume24h: 120000000,
          chains: ['ethereum', 'arbitrum', 'polygon'],
          chainPrices: { ethereum: 8.42, arbitrum: 8.39, polygon: 8.45 }
        },
        {
          symbol: 'AAVE',
          name: 'Aave',
          price: 186.50,
          confidence: 0.92,
          priceChange24h: -1.8,
          marketCap: 2791500000,
          volume24h: 85000000,
          chains: ['ethereum', 'polygon', 'avalanche'],
          chainPrices: { ethereum: 186.50, polygon: 185.80, avalanche: 187.20 }
        },
        {
          symbol: 'COMP',
          name: 'Compound',
          price: 67.30,
          confidence: 0.88,
          priceChange24h: 5.1,
          marketCap: 673000000,
          volume24h: 25000000,
          chains: ['ethereum', 'polygon'],
          chainPrices: { ethereum: 67.30, polygon: 66.85 }
        },
        {
          symbol: 'CRV',
          name: 'Curve DAO',
          price: 0.82,
          confidence: 0.90,
          priceChange24h: 2.4,
          marketCap: 820000000,
          volume24h: 45000000,
          chains: ['ethereum', 'arbitrum', 'polygon', 'fantom'],
          chainPrices: { ethereum: 0.82, arbitrum: 0.815, polygon: 0.825, fantom: 0.818 }
        },
        {
          symbol: 'SNX',
          name: 'Synthetix',
          price: 3.45,
          confidence: 0.85,
          priceChange24h: -0.8,
          marketCap: 345000000,
          volume24h: 18000000,
          chains: ['ethereum', 'optimism'],
          chainPrices: { ethereum: 3.45, optimism: 3.42 }
        }
      ];

      const mockProtocols: ProtocolTVLData[] = [
        {
          protocol: 'Uniswap V3',
          tvl: 4200000000,
          tvlChange24h: 2.1,
          chains: ['ethereum', 'arbitrum', 'polygon'],
          tokens: ['UNI', 'WETH', 'USDC']
        },
        {
          protocol: 'Aave V3',
          tvl: 8900000000,
          tvlChange24h: -0.5,
          chains: ['ethereum', 'polygon', 'avalanche'],
          tokens: ['AAVE', 'WETH', 'USDC', 'DAI']
        },
        {
          protocol: 'Compound V3',
          tvl: 2100000000,
          tvlChange24h: 1.8,
          chains: ['ethereum', 'polygon'],
          tokens: ['COMP', 'WETH', 'USDC']
        },
        {
          protocol: 'Curve Finance',
          tvl: 3800000000,
          tvlChange24h: 0.3,
          chains: ['ethereum', 'arbitrum', 'polygon', 'fantom'],
          tokens: ['CRV', 'USDC', 'DAI', 'USDT']
        }
      ];

      // Calculate arbitrage opportunities
      const opportunities: ArbitrageOpportunity[] = [];
      mockTokens.forEach(token => {
        const chains = Object.keys(token.chainPrices);
        for (let i = 0; i < chains.length; i++) {
          for (let j = i + 1; j < chains.length; j++) {
            const chain1 = chains[i];
            const chain2 = chains[j];
            const price1 = token.chainPrices[chain1];
            const price2 = token.chainPrices[chain2];
            
            if (Math.abs(price1 - price2) > 0.01) {
              const spread = Math.abs(price1 - price2);
              const spreadPercent = (spread / Math.min(price1, price2)) * 100;
              
              if (spreadPercent >= minSpread) {
                opportunities.push({
                  token: token.symbol,
                  buyChain: price1 < price2 ? chain1 : chain2,
                  sellChain: price1 < price2 ? chain2 : chain1,
                  buyPrice: Math.min(price1, price2),
                  sellPrice: Math.max(price1, price2),
                  spread,
                  spreadPercent,
                  confidence: token.confidence * 0.9 // Slight reduction for cross-chain confidence
                });
              }
            }
          }
        }
      });

      setTokens(mockTokens);
      setProtocols(mockProtocols);
      setArbitrageOpportunities(opportunities.sort((a, b) => b.spreadPercent - a.spreadPercent));
    } catch (err) {
      console.error('Failed to load token analysis:', err);
      setError(err instanceof Error ? err.message : 'Failed to load token analysis');
    } finally {
      setLoading(false);
    }
  };

  const calculateTokenProtocolCorrelation = (token: TokenData): number => {
    const relatedProtocol = protocols.find(p => 
      p.tokens.includes(token.symbol) || 
      p.protocol.toLowerCase().includes(token.name.toLowerCase())
    );
    
    if (!relatedProtocol) return 0;
    
    // Simulate correlation based on TVL change and price change alignment
    const correlation = (token.priceChange24h * relatedProtocol.tvlChange24h) > 0 ? 0.75 : -0.35;
    return correlation;
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.9) return 'text-green-400';
    if (confidence >= 0.8) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatPrice = (price: number): string => {
    if (price >= 1) return `$${price.toFixed(2)}`;
    return `$${price.toFixed(4)}`;
  };

  const formatChange = (change: number): string => {
    const color = change >= 0 ? 'text-green-400' : 'text-red-400';
    const sign = change >= 0 ? '+' : '';
    return `<span class="${color}">${sign}${change.toFixed(2)}%</span>`;
  };

  const formatMarketCap = (marketCap: number): string => {
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(0)}M`;
    return `$${marketCap.toLocaleString()}`;
  };

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

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="text-red-400 text-center">
          <div>Failed to load token analysis</div>
          <div className="text-sm text-gray-500 mt-1">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Token Price Analysis</h2>
        <div className="flex items-center space-x-4">
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as any)}
            className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-sm text-white"
          >
            <option value="price_performance">Price Performance</option>
            <option value="arbitrage">Arbitrage Opportunities</option>
            <option value="protocol_correlation">Protocol Correlation</option>
          </select>
          <div className="flex items-center space-x-2 text-sm">
            <label className="text-gray-300">Min Confidence:</label>
            <input
              type="range"
              min="0.5"
              max="1"
              step="0.05"
              value={minConfidence}
              onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
              className="w-16"
            />
            <span className="text-gray-400 w-8">{(minConfidence * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {selectedMetric === 'price_performance' && (
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white">DeFi Token Performance vs Protocol TVL</h3>
            <p className="text-sm text-gray-400 mt-1">
              Confidence-weighted price aggregation across chains
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-300">Token</th>
                  <th className="px-4 py-3 text-right text-gray-300">Price</th>
                  <th className="px-4 py-3 text-right text-gray-300">24h Change</th>
                  <th className="px-4 py-3 text-right text-gray-300">Market Cap</th>
                  <th className="px-4 py-3 text-right text-gray-300">Volume 24h</th>
                  <th className="px-4 py-3 text-center text-gray-300">Confidence</th>
                  <th className="px-4 py-3 text-center text-gray-300">Chains</th>
                  <th className="px-4 py-3 text-right text-gray-300">TVL Correlation</th>
                </tr>
              </thead>
              <tbody>
                {tokens
                  .filter(token => token.confidence >= minConfidence)
                  .map((token, index) => {
                    const correlation = calculateTokenProtocolCorrelation(token);
                    return (
                      <tr key={index} className="border-b border-gray-700 hover:bg-gray-750">
                        <td className="px-4 py-3">
                          <div>
                            <div className="font-medium text-white">{token.symbol}</div>
                            <div className="text-xs text-gray-400">{token.name}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-white font-mono">
                          {formatPrice(token.price)}
                        </td>
                        <td 
                          className="px-4 py-3 text-right font-mono"
                          dangerouslySetInnerHTML={{ __html: formatChange(token.priceChange24h) }}
                        />
                        <td className="px-4 py-3 text-right text-gray-300 font-mono">
                          {token.marketCap ? formatMarketCap(token.marketCap) : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300 font-mono">
                          {token.volume24h ? formatMarketCap(token.volume24h) : 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-mono ${getConfidenceColor(token.confidence)}`}>
                            {(token.confidence * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center space-x-1">
                            {token.chains.map(chain => (
                              <span key={chain} className="px-1 py-0.5 bg-gray-700 text-xs rounded">
                                {chain.slice(0, 3).toUpperCase()}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-mono ${correlation > 0.5 ? 'text-green-400' : correlation < -0.3 ? 'text-red-400' : 'text-gray-400'}`}>
                            {correlation.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedMetric === 'arbitrage' && (
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-white">Cross-Chain Arbitrage Opportunities</h3>
              <p className="text-sm text-gray-400 mt-1">
                Price differences across chains with confidence weighting
              </p>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <label className="text-gray-300">Min Spread:</label>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={minSpread}
                onChange={(e) => setMinSpread(parseFloat(e.target.value))}
                className="w-16"
              />
              <span className="text-gray-400 w-8">{minSpread.toFixed(1)}%</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-300">Token</th>
                  <th className="px-4 py-3 text-left text-gray-300">Buy Chain</th>
                  <th className="px-4 py-3 text-right text-gray-300">Buy Price</th>
                  <th className="px-4 py-3 text-left text-gray-300">Sell Chain</th>
                  <th className="px-4 py-3 text-right text-gray-300">Sell Price</th>
                  <th className="px-4 py-3 text-right text-gray-300">Spread</th>
                  <th className="px-4 py-3 text-right text-gray-300">Spread %</th>
                  <th className="px-4 py-3 text-center text-gray-300">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {arbitrageOpportunities
                  .filter(opp => opp.confidence >= minConfidence && opp.spreadPercent >= minSpread)
                  .map((opportunity, index) => (
                    <tr key={index} className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="px-4 py-3 font-medium text-white">{opportunity.token}</td>
                      <td className="px-4 py-3 text-green-400">{opportunity.buyChain}</td>
                      <td className="px-4 py-3 text-right text-green-400 font-mono">
                        {formatPrice(opportunity.buyPrice)}
                      </td>
                      <td className="px-4 py-3 text-red-400">{opportunity.sellChain}</td>
                      <td className="px-4 py-3 text-right text-red-400 font-mono">
                        {formatPrice(opportunity.sellPrice)}
                      </td>
                      <td className="px-4 py-3 text-right text-yellow-400 font-mono">
                        {formatPrice(opportunity.spread)}
                      </td>
                      <td className="px-4 py-3 text-right text-yellow-400 font-mono font-bold">
                        {opportunity.spreadPercent.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-mono ${getConfidenceColor(opportunity.confidence)}`}>
                          {(opportunity.confidence * 100).toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {arbitrageOpportunities.filter(opp => opp.confidence >= minConfidence && opp.spreadPercent >= minSpread).length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No arbitrage opportunities found with current filters
            </div>
          )}
        </div>
      )}

      {selectedMetric === 'protocol_correlation' && (
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white">Protocol TVL vs Token Performance</h3>
            <p className="text-sm text-gray-400 mt-1">
              Correlation analysis between protocol health and token price movements
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4">
            <div>
              <h4 className="text-md font-medium text-white mb-3">Protocol TVL Changes</h4>
              <div className="space-y-2">
                {protocols.map((protocol, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-900 rounded">
                    <div>
                      <div className="font-medium text-white">{protocol.protocol}</div>
                      <div className="text-sm text-gray-400">
                        TVL: ${(protocol.tvl / 1e9).toFixed(2)}B
                      </div>
                    </div>
                    <div 
                      className="text-right font-mono"
                      dangerouslySetInnerHTML={{ __html: formatChange(protocol.tvlChange24h) }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-md font-medium text-white mb-3">Token-Protocol Correlation</h4>
              <div className="space-y-2">
                {tokens.map((token, index) => {
                  const correlation = calculateTokenProtocolCorrelation(token);
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-900 rounded">
                      <div>
                        <div className="font-medium text-white">{token.symbol}</div>
                        <div 
                          className="text-sm font-mono"
                          dangerouslySetInnerHTML={{ __html: formatChange(token.priceChange24h) }}
                        />
                      </div>
                      <div className="text-right">
                        <span className={`font-mono text-lg ${correlation > 0.5 ? 'text-green-400' : correlation < -0.3 ? 'text-red-400' : 'text-gray-400'}`}>
                          {correlation.toFixed(2)}
                        </span>
                        <div className="text-xs text-gray-500">
                          {correlation > 0.5 ? 'Strong +' : correlation > 0 ? 'Weak +' : correlation > -0.3 ? 'Weak -' : 'Strong -'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}