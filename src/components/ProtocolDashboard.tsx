'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Protocol {
  id: string;
  name: string;
  address: string | null;
  symbol: string;
  url: string;
  description: string;
  chain: string;
  logo: string;
  audits: string;
  audit_note: string | null;
  gecko_id: string | null;
  cmcId: string | null;
  category: string;
  chains: string[];
  module: string;
  twitter: string | null;
  forkedFrom: string[];
  listedAt: number;
  methodology: string;
  misrepresentedTokens: boolean;
  slug: string;
  tvl: number;
  chainTvls: { [chain: string]: number };
  change_1h: number | null;
  change_1d: number | null;
  change_7d: number | null;
  tokenBreakdowns: any;
  mcap: number | null;
  audit_links?: string[];
  parentProtocol?: string;
  wrongLiquidity?: boolean;
  oraclesBreakdown?: Array<{
    name: string;
    type: string;
    proof: string[];
  }>;
}

export default function ProtocolDashboard() {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'tvl' | 'name' | 'change_1d' | 'change_7d' | 'chains'>('tvl');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedProtocols, setExpandedProtocols] = useState<Set<string>>(new Set());
  const [groupByCategory, setGroupByCategory] = useState<boolean>(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadProtocolsData();
  }, []);

  const loadProtocolsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('https://api.llama.fi/protocols');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: Protocol[] = await response.json();
      
      // Filter out protocols with very low TVL to focus on meaningful protocols
      const filteredData = data.filter(protocol => protocol.tvl && protocol.tvl > 1000000);
      
      setProtocols(filteredData);
    } catch (err) {
      console.error('Failed to load protocols data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load protocols data');
    } finally {
      setLoading(false);
    }
  };

  const formatTVL = (tvl?: number) => {
    if (tvl === undefined || tvl === null || !isFinite(tvl)) return '-';
    if (tvl >= 1e12) return `$${(tvl / 1e12).toFixed(2)}T`;
    if (tvl >= 1e9) return `$${(tvl / 1e9).toFixed(2)}B`;
    if (tvl >= 1e6) return `$${(tvl / 1e6).toFixed(2)}M`;
    if (tvl >= 1e3) return `$${(tvl / 1e3).toFixed(2)}K`;
    return `$${tvl.toFixed(2)}`;
  };

  const formatChange = (change: number | null | undefined): string => {
    if (change === null || change === undefined || !isFinite(change)) {
      return '<span class="text-gray-500">-</span>';
    }
    const color = change >= 0 ? 'text-green-400' : 'text-red-400';
    const sign = change >= 0 ? '+' : '';
    return `<span class="${color}">${sign}${change.toFixed(2)}%</span>`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getChainIcon = (chain: string) => {
    const icons: { [key: string]: string } = {
      'ethereum': '⟠',
      'solana': '◎',
      'polygon': '⬟',
      'base': '🔵',
      'arbitrum': '🔷',
      'optimism': '🔴',
      'bsc': '🟨',
      'binance': '🟨',
      'avalanche': '🔺',
      'multi-chain': '🔗'
    };
    return icons[chain.toLowerCase()] || '⚫';
  };

  const categories = ['All', ...Array.from(new Set(protocols.map(p => p.category)))];
  
  // Calculate category statistics
  const categoryStats = protocols.reduce((acc, protocol) => {
    const category = protocol.category;
    if (!acc[category]) {
      acc[category] = { count: 0, totalTvl: 0, protocols: [] };
    }
    acc[category].count++;
    acc[category].totalTvl += protocol.tvl || 0;
    acc[category].protocols.push(protocol);
    return acc;
  }, {} as { [key: string]: { count: number; totalTvl: number; protocols: Protocol[] } });

  const filteredProtocols = protocols
    .filter(protocol => {
      const matchesSearch = 
        protocol.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        protocol.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        protocol.chain?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || protocol.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;
      
      switch (sortBy) {
        case 'name':
          aVal = a.name || '';
          bVal = b.name || '';
          break;
        case 'tvl':
          aVal = a.tvl || 0;
          bVal = b.tvl || 0;
          break;
        case 'change_1d':
          aVal = a.change_1d ?? 0;
          bVal = b.change_1d ?? 0;
          break;
        case 'change_7d':
          aVal = a.change_7d ?? 0;
          bVal = b.change_7d ?? 0;
          break;
        case 'chains':
          aVal = a.chains?.length || 0;
          bVal = b.chains?.length || 0;
          break;
        default:
          return 0;
      }
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      } else {
        return sortDirection === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
      }
    });

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('desc');
    }
  };

  const toggleProtocolExpansion = (protocolId: string) => {
    const newExpanded = new Set(expandedProtocols);
    if (newExpanded.has(protocolId)) {
      newExpanded.delete(protocolId);
    } else {
      newExpanded.add(protocolId);
    }
    setExpandedProtocols(newExpanded);
  };

  const toggleCategoryExpansion = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Group protocols by category for grouped view
  const groupedProtocols = filteredProtocols.reduce((acc, protocol) => {
    const category = protocol.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(protocol);
    return acc;
  }, {} as { [key: string]: Protocol[] });

  const getCategoryColor = (category: string) => {
    const colors = {
      'DEX': 'bg-blue-900/30 border-blue-600',
      'Lending': 'bg-green-900/30 border-green-600',
      'Yield': 'bg-yellow-900/30 border-yellow-600',
      'Derivatives': 'bg-purple-900/30 border-purple-600',
      'CDP': 'bg-red-900/30 border-red-600',
      'Bridge': 'bg-indigo-900/30 border-indigo-600',
      'Liquid Staking': 'bg-cyan-900/30 border-cyan-600',
      'CEX': 'bg-gray-900/30 border-gray-600',
      'Services': 'bg-pink-900/30 border-pink-600',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-900/30 border-gray-600';
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
        <h2 className="text-xl font-bold text-white mb-4">Protocol Dashboard</h2>
        <div className="bg-red-900 border border-red-700 rounded-lg p-4">
          <p className="text-red-200">{error}</p>
          <button
            onClick={loadProtocolsData}
            className="mt-2 bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Protocol Dashboard ({filteredProtocols.length.toLocaleString()})</h2>
          <button
            onClick={loadProtocolsData}
            disabled={loading}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Search protocols, categories, or chains..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category} {category !== 'All' && categoryStats[category] ? `(${categoryStats[category].count})` : ''}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={groupByCategory}
                  onChange={(e) => setGroupByCategory(e.target.checked)}
                  className="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                Group by Category
              </label>
            </div>
          </div>

          {/* Category Overview Cards */}
          {selectedCategory === 'All' && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Object.entries(categoryStats)
                .sort(([,a], [,b]) => b.totalTvl - a.totalTvl)
                .slice(0, 12)
                .map(([category, stats]) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`p-3 rounded-lg border text-left hover:bg-gray-700 transition-colors ${getCategoryColor(category)}`}
                >
                  <div className="text-sm font-medium text-white truncate">{category}</div>
                  <div className="text-xs text-gray-300">{stats.count} protocols</div>
                  <div className="text-xs text-gray-400">{formatTVL(stats.totalTvl)}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Table Headers */}
        <div className="grid grid-cols-8 gap-2 items-center px-3 py-2 border-b border-gray-700 mb-2">
          <button 
            onClick={() => handleSort('name')}
            className="text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-200 transition-colors text-left flex items-center gap-1"
          >
            Protocol
            {sortBy === 'name' && <span className="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
          </button>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">Category</div>
          <button 
            onClick={() => handleSort('tvl')}
            className="text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-200 transition-colors text-center flex items-center justify-center gap-1"
          >
            TVL
            {sortBy === 'tvl' && <span className="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
          </button>
          <button 
            onClick={() => handleSort('change_1d')}
            className="text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-200 transition-colors text-center flex items-center justify-center gap-1"
          >
            24h
            {sortBy === 'change_1d' && <span className="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
          </button>
          <button 
            onClick={() => handleSort('change_7d')}
            className="text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-200 transition-colors text-center flex items-center justify-center gap-1"
          >
            7d
            {sortBy === 'change_7d' && <span className="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
          </button>
          <button 
            onClick={() => handleSort('chains')}
            className="text-xs font-semibold text-gray-400 uppercase tracking-wide hover:text-gray-200 transition-colors text-center flex items-center justify-center gap-1"
          >
            Chains
            {sortBy === 'chains' && <span className="text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
          </button>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">Audits</div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">Listed</div>
        </div>

        {/* Protocol Cards */}
        <div className="space-y-2">
          {filteredProtocols.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No protocols match your current filters</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('All');
                }}
                className="mt-2 text-blue-400 hover:text-blue-300 text-sm"
              >
                Clear filters
              </button>
            </div>
          ) : groupByCategory ? (
            /* Grouped by Category View */
            Object.entries(groupedProtocols)
              .sort(([,a], [,b]) => {
                const aTvl = a.reduce((sum, p) => sum + (p.tvl || 0), 0);
                const bTvl = b.reduce((sum, p) => sum + (p.tvl || 0), 0);
                return bTvl - aTvl;
              })
              .map(([category, categoryProtocols]) => {
                const isExpanded = expandedCategories.has(category);
                const categoryTvl = categoryProtocols.reduce((sum, p) => sum + (p.tvl || 0), 0);
                
                return (
                  <div key={category} className="space-y-2">
                    {/* Category Header */}
                    <div 
                      className={`p-4 rounded-lg border cursor-pointer hover:bg-gray-700 transition-colors ${getCategoryColor(category)}`}
                      onClick={() => toggleCategoryExpansion(category)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{isExpanded ? '▼' : '▶'}</span>
                          <div>
                            <h3 className="text-lg font-semibold text-white">{category}</h3>
                            <p className="text-sm text-gray-300">
                              {categoryProtocols.length} protocols • {formatTVL(categoryTvl)} total TVL
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-400">Avg TVL</div>
                          <div className="text-white font-medium">
                            {formatTVL(categoryTvl / categoryProtocols.length)}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Category Protocols */}
                    {isExpanded && (
                      <div className="ml-4 space-y-2">
                        {categoryProtocols.map((protocol, index) => {
              const protocolId = `${protocol.id}-${index}`;
              const isExpanded = expandedProtocols.has(protocolId);
              
              return (
                <div 
                  key={protocolId} 
                  className="bg-gray-900 rounded-lg border border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer"
                  onClick={() => toggleProtocolExpansion(protocolId)}
                >
                  {/* Compact row */}
                  <div className="p-3">
                    <div className="grid grid-cols-8 gap-2 items-center text-sm">
                      {/* Protocol Name */}
                      <div className="flex items-center gap-2">
                        <img 
                          src={protocol.logo} 
                          alt={protocol.name} 
                          className="w-6 h-6 rounded-full bg-gray-700"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <div>
                          <div className="font-medium text-white truncate">{protocol.name}</div>
                          <div className="text-xs text-gray-400">{getChainIcon(protocol.chain)} {protocol.chain}</div>
                        </div>
                      </div>
                      
                      {/* Category */}
                      <div className="text-center">
                        <span className="text-gray-300 text-xs">{protocol.category}</span>
                      </div>
                      
                      {/* TVL */}
                      <div className="text-center">
                        <span className="font-medium text-white">{formatTVL(protocol.tvl)}</span>
                      </div>
                      
                      {/* 24h Change */}
                      <div className="text-center" dangerouslySetInnerHTML={{ __html: formatChange(protocol.change_1d) }} />
                      
                      {/* 7d Change */}
                      <div className="text-center" dangerouslySetInnerHTML={{ __html: formatChange(protocol.change_7d) }} />
                      
                      {/* Chains Count */}
                      <div className="text-center">
                        <span className="text-gray-300">{protocol.chains.length}</span>
                      </div>
                      
                      {/* Audits */}
                      <div className="text-center">
                        <span className="text-gray-300">{protocol.audits}</span>
                      </div>
                      
                      {/* Listed Date */}
                      <div className="text-center">
                        <span className="text-gray-300 text-xs">{formatDate(protocol.listedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded detailed view */}
                  {isExpanded && (
                    <div className="border-t border-gray-700 p-6 bg-gray-850">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Basic Information */}
                        <div className="space-y-3">
                          <h4 className="text-gray-300 font-semibold border-b border-gray-600 pb-1">Basic Information</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">ID:</span>
                              <span className="text-gray-300">{protocol.id}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Symbol:</span>
                              <span className="text-gray-300">{protocol.symbol}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Slug:</span>
                              <span className="text-gray-300 font-mono text-xs">{protocol.slug}</span>
                            </div>
                            {protocol.address && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Address:</span>
                                <span className="text-gray-300 font-mono text-xs">{protocol.address.slice(0, 10)}...</span>
                              </div>
                            )}
                            {protocol.twitter && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Twitter:</span>
                                <a 
                                  href={`https://twitter.com/${protocol.twitter}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  @{protocol.twitter}
                                </a>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-gray-400">Website:</span>
                              <a 
                                href={protocol.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {protocol.url.replace('https://', '').slice(0, 20)}...
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* Financial Metrics */}
                        <div className="space-y-3">
                          <h4 className="text-gray-300 font-semibold border-b border-gray-600 pb-1">Financial Metrics</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Total TVL:</span>
                              <span className="text-white font-semibold">{formatTVL(protocol.tvl)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">1h Change:</span>
                              <span dangerouslySetInnerHTML={{ __html: formatChange(protocol.change_1h) }} />
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">24h Change:</span>
                              <span dangerouslySetInnerHTML={{ __html: formatChange(protocol.change_1d) }} />
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">7d Change:</span>
                              <span dangerouslySetInnerHTML={{ __html: formatChange(protocol.change_7d) }} />
                            </div>
                            {protocol.mcap && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Market Cap:</span>
                                <span className="text-gray-300">{formatTVL(protocol.mcap)}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Chain Distribution */}
                        <div className="space-y-3">
                          <h4 className="text-gray-300 font-semibold border-b border-gray-600 pb-1">Chain Distribution</h4>
                          <div className="space-y-2 text-sm max-h-40 overflow-y-auto">
                            {Object.entries(protocol.chainTvls).map(([chain, tvl]) => (
                              <div key={chain} className="flex justify-between">
                                <span className="text-gray-400">{getChainIcon(chain)} {chain}:</span>
                                <span className="text-gray-300">{formatTVL(tvl)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Description & Security */}
                        <div className="lg:col-span-3 space-y-4">
                          <div>
                            <h4 className="text-gray-300 font-semibold border-b border-gray-600 pb-1 mb-2">Description</h4>
                            <p className="text-gray-300 text-sm leading-relaxed">{protocol.description}</p>
                          </div>

                          {protocol.methodology && (
                            <div>
                              <h4 className="text-gray-300 font-semibold border-b border-gray-600 pb-1 mb-2">Methodology</h4>
                              <p className="text-gray-300 text-sm leading-relaxed">{protocol.methodology}</p>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="space-y-2">
                              <h5 className="text-gray-400 font-medium">Security & Audits</h5>
                              <div className="space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Audits:</span>
                                  <span className="text-gray-300">{protocol.audits}</span>
                                </div>
                                {protocol.audit_links && protocol.audit_links.length > 0 && (
                                  <div>
                                    {protocol.audit_links.map((link, idx) => (
                                      <a 
                                        key={idx}
                                        href={link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-400 hover:text-blue-300 text-xs block"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        Audit Report {idx + 1}
                                      </a>
                                    ))}
                                  </div>
                                )}
                                {protocol.oraclesBreakdown && protocol.oraclesBreakdown.length > 0 && (
                                  <div>
                                    <span className="text-gray-400">Oracles:</span>
                                    <div className="ml-2">
                                      {protocol.oraclesBreakdown.map((oracle, idx) => (
                                        <div key={idx} className="text-xs text-gray-300">
                                          {oracle.name} ({oracle.type})
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <h5 className="text-gray-400 font-medium">Development</h5>
                              <div className="space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Module:</span>
                                  <span className="text-gray-300 font-mono text-xs">{protocol.module}</span>
                                </div>
                                {protocol.forkedFrom && protocol.forkedFrom.length > 0 && (
                                  <div>
                                    <span className="text-gray-400">Forked From:</span>
                                    <div className="ml-2">
                                      {protocol.forkedFrom.map((fork, idx) => (
                                        <div key={idx} className="text-xs text-gray-300">{fork}</div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {protocol.parentProtocol && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Parent:</span>
                                    <span className="text-gray-300 text-xs">{protocol.parentProtocol}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <h5 className="text-gray-400 font-medium">Data Quality</h5>
                              <div className="space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Wrong Liquidity:</span>
                                  <span className="text-gray-300">{protocol.wrongLiquidity ? 'Yes' : 'No'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Misrep. Tokens:</span>
                                  <span className="text-gray-300">{protocol.misrepresentedTokens ? 'Yes' : 'No'}</span>
                                </div>
                                {protocol.gecko_id && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">CoinGecko ID:</span>
                                    <span className="text-gray-300 text-xs">{protocol.gecko_id}</span>
                                  </div>
                                )}
                                {protocol.cmcId && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">CMC ID:</span>
                                    <span className="text-gray-300 text-xs">{protocol.cmcId}</span>
                                  </div>
                                )}
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
                    )}
                  </div>
                );
              })
          ) : (
            /* Regular List View */
            filteredProtocols.map((protocol, index) => {
              const protocolId = `${protocol.id}-${index}`;
              const isExpanded = expandedProtocols.has(protocolId);
              
              return (
                <div 
                  key={protocolId} 
                  className="bg-gray-900 rounded-lg border border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer"
                  onClick={() => toggleProtocolExpansion(protocolId)}
                >
                  {/* Compact row */}
                  <div className="p-3">
                    <div className="grid grid-cols-8 gap-2 items-center text-sm">
                      {/* Protocol Name */}
                      <div className="flex items-center gap-2">
                        <img 
                          src={protocol.logo} 
                          alt={protocol.name} 
                          className="w-6 h-6 rounded-full bg-gray-700"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        <div>
                          <div className="font-medium text-white truncate">{protocol.name}</div>
                          <div className="text-xs text-gray-400">{getChainIcon(protocol.chain)} {protocol.chain}</div>
                        </div>
                      </div>
                      
                      {/* Category */}
                      <div className="text-center">
                        <span className="text-gray-300 text-xs">{protocol.category}</span>
                      </div>
                      
                      {/* TVL */}
                      <div className="text-center">
                        <span className="font-medium text-white">{formatTVL(protocol.tvl)}</span>
                      </div>
                      
                      {/* 24h Change */}
                      <div className="text-center" dangerouslySetInnerHTML={{ __html: formatChange(protocol.change_1d) }} />
                      
                      {/* 7d Change */}
                      <div className="text-center" dangerouslySetInnerHTML={{ __html: formatChange(protocol.change_7d) }} />
                      
                      {/* Chains Count */}
                      <div className="text-center">
                        <span className="text-gray-300">{protocol.chains.length}</span>
                      </div>
                      
                      {/* Audits */}
                      <div className="text-center">
                        <span className="text-gray-300">{protocol.audits}</span>
                      </div>
                      
                      {/* Listed Date */}
                      <div className="text-center">
                        <span className="text-gray-300 text-xs">{formatDate(protocol.listedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded detailed view */}
                  {isExpanded && (
                    <div className="border-t border-gray-700 p-6 bg-gray-850">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Basic Information */}
                        <div className="space-y-3">
                          <h4 className="text-gray-300 font-semibold border-b border-gray-600 pb-1">Basic Information</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">ID:</span>
                              <span className="text-gray-300">{protocol.id}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Symbol:</span>
                              <span className="text-gray-300">{protocol.symbol}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Slug:</span>
                              <span className="text-gray-300 font-mono text-xs">{protocol.slug}</span>
                            </div>
                            {protocol.address && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Address:</span>
                                <span className="text-gray-300 font-mono text-xs">{protocol.address.slice(0, 10)}...</span>
                              </div>
                            )}
                            {protocol.twitter && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Twitter:</span>
                                <a 
                                  href={`https://twitter.com/${protocol.twitter}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  @{protocol.twitter}
                                </a>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-gray-400">Website:</span>
                              <a 
                                href={protocol.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {protocol.url.replace('https://', '').slice(0, 20)}...
                              </a>
                            </div>
                          </div>
                        </div>

                        {/* Financial Metrics */}
                        <div className="space-y-3">
                          <h4 className="text-gray-300 font-semibold border-b border-gray-600 pb-1">Financial Metrics</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Total TVL:</span>
                              <span className="text-white font-semibold">{formatTVL(protocol.tvl)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">1h Change:</span>
                              <span dangerouslySetInnerHTML={{ __html: formatChange(protocol.change_1h) }} />
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">24h Change:</span>
                              <span dangerouslySetInnerHTML={{ __html: formatChange(protocol.change_1d) }} />
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">7d Change:</span>
                              <span dangerouslySetInnerHTML={{ __html: formatChange(protocol.change_7d) }} />
                            </div>
                            {protocol.mcap && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Market Cap:</span>
                                <span className="text-gray-300">{formatTVL(protocol.mcap)}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Chain Distribution */}
                        <div className="space-y-3">
                          <h4 className="text-gray-300 font-semibold border-b border-gray-600 pb-1">Chain Distribution</h4>
                          <div className="space-y-2 text-sm max-h-40 overflow-y-auto">
                            {Object.entries(protocol.chainTvls).map(([chain, tvl]) => (
                              <div key={chain} className="flex justify-between">
                                <span className="text-gray-400">{getChainIcon(chain)} {chain}:</span>
                                <span className="text-gray-300">{formatTVL(tvl)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Description & Security */}
                        <div className="lg:col-span-3 space-y-4">
                          <div>
                            <h4 className="text-gray-300 font-semibold border-b border-gray-600 pb-1 mb-2">Description</h4>
                            <p className="text-gray-300 text-sm leading-relaxed">{protocol.description}</p>
                          </div>

                          {protocol.methodology && (
                            <div>
                              <h4 className="text-gray-300 font-semibold border-b border-gray-600 pb-1 mb-2">Methodology</h4>
                              <p className="text-gray-300 text-sm leading-relaxed">{protocol.methodology}</p>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="space-y-2">
                              <h5 className="text-gray-400 font-medium">Security & Audits</h5>
                              <div className="space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Audits:</span>
                                  <span className="text-gray-300">{protocol.audits}</span>
                                </div>
                                {protocol.audit_links && protocol.audit_links.length > 0 && (
                                  <div>
                                    {protocol.audit_links.map((link, idx) => (
                                      <a 
                                        key={idx}
                                        href={link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-400 hover:text-blue-300 text-xs block"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        Audit Report {idx + 1}
                                      </a>
                                    ))}
                                  </div>
                                )}
                                {protocol.oraclesBreakdown && protocol.oraclesBreakdown.length > 0 && (
                                  <div>
                                    <span className="text-gray-400">Oracles:</span>
                                    <div className="ml-2">
                                      {protocol.oraclesBreakdown.map((oracle, idx) => (
                                        <div key={idx} className="text-xs text-gray-300">
                                          {oracle.name} ({oracle.type})
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <h5 className="text-gray-400 font-medium">Development</h5>
                              <div className="space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Module:</span>
                                  <span className="text-gray-300 font-mono text-xs">{protocol.module}</span>
                                </div>
                                {protocol.forkedFrom && protocol.forkedFrom.length > 0 && (
                                  <div>
                                    <span className="text-gray-400">Forked From:</span>
                                    <div className="ml-2">
                                      {protocol.forkedFrom.map((fork, idx) => (
                                        <div key={idx} className="text-xs text-gray-300">{fork}</div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {protocol.parentProtocol && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Parent:</span>
                                    <span className="text-gray-300 text-xs">{protocol.parentProtocol}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <h5 className="text-gray-400 font-medium">Data Quality</h5>
                              <div className="space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Wrong Liquidity:</span>
                                  <span className="text-gray-300">{protocol.wrongLiquidity ? 'Yes' : 'No'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Misrep. Tokens:</span>
                                  <span className="text-gray-300">{protocol.misrepresentedTokens ? 'Yes' : 'No'}</span>
                                </div>
                                {protocol.gecko_id && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">CoinGecko ID:</span>
                                    <span className="text-gray-300 text-xs">{protocol.gecko_id}</span>
                                  </div>
                                )}
                                {protocol.cmcId && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">CMC ID:</span>
                                    <span className="text-gray-300 text-xs">{protocol.cmcId}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 text-xs text-gray-500 text-center">
          Data provided by DefiLlama • Click any protocol to see complete API data
        </div>
      </div>
    </div>
  );
}