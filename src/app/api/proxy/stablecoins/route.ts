import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const url = 'https://stablecoins.llama.fi/stablecoins';

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
    console.error('Stablecoins API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stablecoins data' },
      { status: 500 }
    );
  }
}