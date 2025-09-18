/**
 * Common API utilities and error handling
 */

import { NextResponse } from 'next/server';

// Common headers for DeFiLlama API requests
export const DEFI_LLAMA_HEADERS = {
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (compatible; DeFiDashboard/1.0)',
};

// Common CORS headers for responses
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Create standardized API proxy response
export function createProxyResponse(data: any, cacheSeconds = 300) {
  return NextResponse.json(data, {
    headers: {
      ...CORS_HEADERS,
      'Cache-Control': `public, max-age=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 2}`
    }
  });
}

// Create standardized error response
export function createErrorResponse(message: string | Error, status = 500) {
  return NextResponse.json(
    { 
      error: 'API Error', 
      message: message instanceof Error ? message.message : message 
    },
    { 
      status,
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    }
  );
}

// Create OPTIONS response for CORS
export function createOptionsResponse() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}

// Fetch data from DeFiLlama API with error handling
export async function fetchFromDeFiLlama(
  endpoint: string, 
  cacheSeconds = 300
): Promise<any> {
  const response = await fetch(`https://api.llama.fi${endpoint}`, {
    headers: DEFI_LLAMA_HEADERS,
    next: { revalidate: cacheSeconds }
  });

  if (!response.ok) {
    throw new Error(`DeFiLlama API error: ${response.status}`);
  }

  return response.json();
}