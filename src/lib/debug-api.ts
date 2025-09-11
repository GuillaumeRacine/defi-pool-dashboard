/**
 * Debug API testing - simplified version to test DefiLlama connectivity
 */

export async function testDefiLlamaAPI() {
  const apiKey = process.env.NEXT_PUBLIC_DEFILLAMA_API_KEY;
  console.log('🔑 API Key available:', !!apiKey);
  console.log('🔑 API Key length:', apiKey?.length || 0);
  
  try {
    // First test: basic protocols endpoint (no auth required)
    console.log('🚀 Testing basic protocols endpoint...');
    const protocolsResponse = await fetch('https://api.llama.fi/protocols?limit=10');
    console.log('📊 Protocols status:', protocolsResponse.status);
    
    if (protocolsResponse.ok) {
      const protocols = await protocolsResponse.json();
      console.log('✅ Protocols data received:', protocols.length, 'protocols');
      
      // Second test: pools endpoint
      console.log('🚀 Testing pools endpoint...');
      const poolsResponse = await fetch('https://api.llama.fi/pools');
      console.log('💧 Pools status:', poolsResponse.status);
      
      if (poolsResponse.ok) {
        const poolsData = await poolsResponse.json();
        console.log('✅ Pools data received:', poolsData.data?.length || 0, 'pools');
        return { success: true, poolsCount: poolsData.data?.length || 0 };
      } else {
        const errorText = await poolsResponse.text();
        console.error('❌ Pools error:', errorText);
        return { success: false, error: `Pools API error: ${poolsResponse.status} - ${errorText}` };
      }
    } else {
      const errorText = await protocolsResponse.text();
      console.error('❌ Protocols error:', errorText);
      return { success: false, error: `Protocols API error: ${protocolsResponse.status} - ${errorText}` };
    }
  } catch (error) {
    console.error('💥 API Test failed:', error);
    return { success: false, error: `Network error: ${error}` };
  }
}

export async function testWithMockData() {
  console.log('🔧 Using mock data for development...');
  
  // Create mock pool data that matches our expected format
  const mockPools = [
    {
      pool: 'mock-pool-1',
      chain: 'ethereum',
      project: 'uniswap-v3',
      symbol: 'ETH-USDC',
      tvlUsd: 150000000,
      apy: 12.5
    },
    {
      pool: 'mock-pool-2', 
      chain: 'solana',
      project: 'orca',
      symbol: 'SOL-USDC',
      tvlUsd: 45000000,
      apy: 18.2
    },
    {
      pool: 'mock-pool-3',
      chain: 'base',
      project: 'aerodrome',
      symbol: 'WETH-USDC',
      tvlUsd: 25000000,
      apy: 15.8
    }
  ];
  
  return {
    data: mockPools,
    error: null,
    cached: false,
    timestamp: new Date().toISOString()
  };
}