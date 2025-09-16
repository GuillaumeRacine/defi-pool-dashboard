'use client';

import { useState, useEffect } from 'react';
import { cacheManager } from '@/lib/cache';

export default function CacheStatus() {
  const [stats, setStats] = useState({
    memoryEntries: 0,
    localStorageEntries: 0,
    totalSize: '0 KB'
  });

  useEffect(() => {
    const updateStats = () => {
      setStats(cacheManager.getStats());
    };

    // Initial load
    updateStats();

    // Update every 5 seconds
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-xs">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-gray-300 font-medium">Cache Status</h3>
        <button
          onClick={() => {
            cacheManager.clearCategory('tokenPrices');
            cacheManager.clearCategory('pools');
            cacheManager.clearCategory('tokenHistorical');
            cacheManager.clearCategory('poolHistorical');
            setStats(cacheManager.getStats());
          }}
          className="text-blue-400 hover:text-blue-300 transition-colors"
          title="Clear all cache"
        >
          Clear Cache
        </button>
      </div>
      <div className="space-y-1 text-gray-400">
        <div className="flex justify-between">
          <span>Memory:</span>
          <span className="text-green-400">{stats.memoryEntries} entries</span>
        </div>
        <div className="flex justify-between">
          <span>Storage:</span>
          <span className="text-blue-400">{stats.localStorageEntries} entries</span>
        </div>
        <div className="flex justify-between">
          <span>Size:</span>
          <span className="text-orange-400">{stats.totalSize}</span>
        </div>
      </div>
    </div>
  );
}