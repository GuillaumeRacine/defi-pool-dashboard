import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chain = searchParams.get('chain') || 'all';

    let url: string;
    if (chain === 'all') {
      url = 'https://stablecoins.llama.fi/stablecoincharts/all';
    } else {
      url = `https://stablecoins.llama.fi/stablecoincharts/${chain}`;
    }

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Stablecoin flows API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stablecoin flows data' },
      { status: 500 }
    );
  }
}