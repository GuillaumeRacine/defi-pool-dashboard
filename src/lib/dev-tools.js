// Development tools for debugging API calls and data quality
if (process.env.NODE_ENV === 'development') {
  window.debugDefiLlama = {
    logApiCalls: true,
    
    checkDataQuality: (poolData) => {
      console.group('🔍 Pool Data Quality Check');
      console.log('Pool:', poolData.pool_name);
      console.log('Quality Score:', poolData.data_quality_score);
      console.log('Validation Passed:', poolData.validation_passed);
      console.log('Data Points:', poolData.data_points);
      console.log('Last Updated:', poolData.last_updated);
      console.groupEnd();
    },
    
    showPoolStats: (pools) => {
      const stats = Object.values(pools).reduce((acc, pool) => {
        acc.totalPools++;
        acc.totalTVL += pool.orca_augmentation?.orca_metrics?.current_liquidity || 0;
        acc.qualitySum += pool.data_quality_score;
        acc.chains.add(pool.blockchain);
        return acc;
      }, {
        totalPools: 0,
        totalTVL: 0,
        qualitySum: 0,
        chains: new Set()
      });
      
      console.group('📊 Pool Registry Stats');
      console.log('Total Pools:', stats.totalPools);
      console.log('Total TVL:', `$${(stats.totalTVL / 1e6).toFixed(2)}M`);
      console.log('Average Quality:', (stats.qualitySum / stats.totalPools).toFixed(1));
      console.log('Active Chains:', Array.from(stats.chains).join(', '));
      console.groupEnd();
    }
  };
  
  console.log('🚀 DeFi Dashboard Dev Tools Loaded');
  console.log('Available commands:');
  console.log('- window.debugDefiLlama.checkDataQuality(poolData)');
  console.log('- window.debugDefiLlama.showPoolStats(pools)');
}