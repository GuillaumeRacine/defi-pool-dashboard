/**
 * API Proxy for DeFiLlama DEX Historical Data
 */

import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    // Fetch all three data sources in parallel
    const [volumeResponse, feesResponse, tvlResponse] = await Promise.allSettled([
      fetch(`https://api.llama.fi/summary/dexs/${slug}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; DeFiDashboard/1.0)',
        },
        next: { revalidate: 3600 }
      }),
      fetch(`https://api.llama.fi/summary/fees/${slug}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; DeFiDashboard/1.0)',
        },
        next: { revalidate: 3600 }
      }),
      // For TVL, we need to map DEX slug to protocol name (most are the same)
      fetch(`https://api.llama.fi/protocol/${slug.replace('-dex', '').replace('-v3', '').replace('-v2', '')}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; DeFiDashboard/1.0)',
        },
        next: { revalidate: 3600 }
      })
    ]);

    // Process volume data
    let volumeData = null;
    if (volumeResponse.status === 'fulfilled' && volumeResponse.value.ok) {
      volumeData = await volumeResponse.value.json();
    }

    // Process fees data
    let feesData = null;
    if (feesResponse.status === 'fulfilled' && feesResponse.value.ok) {
      feesData = await feesResponse.value.json();
    }

    // Process TVL data
    let tvlData = null;
    if (tvlResponse.status === 'fulfilled' && tvlResponse.value.ok) {
      tvlData = await tvlResponse.value.json();
    }

    // If no data available, return error
    if (!volumeData && !feesData && !tvlData) {
      throw new Error('No data available for this protocol');
    }

    // Extract chart data from all sources
    const chartData = {
      // Volume data
      totalDataChart: volumeData?.totalDataChart || [],
      totalDataChartBreakdown: volumeData?.totalDataChartBreakdown || {},
      
      // Fees data
      feesDataChart: feesData?.totalDataChart || [],
      feesDataChartBreakdown: feesData?.totalDataChartBreakdown || {},
      
      // TVL data (convert to same format as others)
      tvlDataChart: tvlData?.tvl ? tvlData.tvl.map((item: any) => [item.date, item.totalLiquidityUSD]) : [],
      
      // Protocol info (prefer volume data, fallback to fees or TVL)
      name: volumeData?.name || feesData?.name || tvlData?.name || '',
      displayName: volumeData?.displayName || feesData?.displayName || tvlData?.name || '',
      logo: volumeData?.logo || feesData?.logo || tvlData?.logo || '',
      slug: volumeData?.slug || feesData?.slug || slug,
      chains: volumeData?.chains || feesData?.chains || tvlData?.chains || []
    };
    
    return NextResponse.json(chartData, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200'
      }
    });
  } catch (error) {
    console.error('Error fetching DEX historical data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch DEX historical data', message: error instanceof Error ? error.message : 'Unknown error' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}