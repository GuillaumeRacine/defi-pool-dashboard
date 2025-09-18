import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');
  const days = searchParams.get('days') || '365';
  
  if (!token) {
    return NextResponse.json({ error: 'Token parameter is required' }, { status: 400 });
  }

  try {
    const tokenAddresses: { [key: string]: string } = {
      'BTC': 'coingecko:bitcoin',
      'ETH': 'coingecko:ethereum',
      'SOL': 'coingecko:solana', 
      'SUI': 'coingecko:sui'
    };

    const address = tokenAddresses[token] || `coingecko:${token.toLowerCase()}`;
    const startTime = Math.floor(Date.now() / 1000) - (parseInt(days) * 24 * 60 * 60);
    
    let period = '1d';
    const numDays = parseInt(days);
    if (numDays <= 7) period = '4h';
    else if (numDays <= 30) period = '1d';
    else if (numDays <= 365) period = '1d';
    else period = '1w'; // > 1 year - weekly (max ~4 years)
    
    const url = `https://coins.llama.fi/chart/${address}?start=${startTime}&span=${days}&period=${period}`;
    
    console.log(`Proxying request to: ${url}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Parse the DeFiLlama response format
    const coinData = data?.coins?.[address];
    if (!coinData || !coinData.prices || coinData.prices.length === 0) {
      return NextResponse.json({ error: `No historical price data available for ${token}` }, { status: 404 });
    }

    // Convert to our format
    const historicalData = coinData.prices.map((pricePoint: any) => ({
      timestamp: pricePoint.timestamp * 1000, // Convert to milliseconds
      price: pricePoint.price
    }));

    console.log(`Loaded ${historicalData.length} historical price points for ${token}`);

    return NextResponse.json({ 
      data: historicalData,
      symbol: coinData.symbol,
      confidence: coinData.confidence 
    });
    
  } catch (error) {
    console.error(`Failed to fetch token history for ${token}:`, error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch token history' 
    }, { status: 500 });
  }
}