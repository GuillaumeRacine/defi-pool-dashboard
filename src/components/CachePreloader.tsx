'use client';

import { useEffect } from 'react';
import { defiLlamaAPI } from '@/lib/defi-api';

/**
 * Preloads critical data into cache on app startup for instant subsequent loads
 */
export default function CachePreloader() {
  useEffect(() => {
    const preloadData = async () => {
      try {
        console.log('🚀 Starting cache preload...');
        
        // Preload token prices (most frequently accessed)
        const tokens = ['BTC', 'ETH', 'SOL', 'SUI'];
        const tokenPricesPromise = defiLlamaAPI.getTokenPrices(tokens)
          .then(() => console.log('✅ Token prices cached'))
          .catch(err => console.warn('⚠️ Token prices preload failed:', err));

        // Preload high TVL pools
        const poolsPromise = defiLlamaAPI.getHighTVLPools()
          .then(() => console.log('✅ Pools data cached'))
          .catch(err => console.warn('⚠️ Pools preload failed:', err));

        // Preload 1-year historical data for main tokens (lower priority)
        const historicalPromises = tokens.map(token => 
          defiLlamaAPI.getTokenHistoricalData(token, 365)
            .then(() => console.log(`✅ ${token} 1Y history cached`))
            .catch(err => console.warn(`⚠️ ${token} history preload failed:`, err))
        );

        // Wait for critical data first (token prices and pools)
        await Promise.all([tokenPricesPromise, poolsPromise]);
        console.log('🎯 Critical data preloaded');

        // Load historical data in background
        Promise.all(historicalPromises).then(() => {
          console.log('📊 Historical data preloaded');
        });

      } catch (error) {
        console.error('Cache preload error:', error);
      }
    };

    // Start preloading after a small delay to not block initial render
    const timeoutId = setTimeout(preloadData, 100);
    
    return () => clearTimeout(timeoutId);
  }, []);

  // This component doesn't render anything
  return null;
}