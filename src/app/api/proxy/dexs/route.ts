/**
 * API Proxy for DeFiLlama DEX Overview
 */

import { fetchFromDeFiLlama, createProxyResponse, createErrorResponse, createOptionsResponse } from '@/lib/api';

export async function GET() {
  try {
    const data = await fetchFromDeFiLlama('/overview/dexs', 300);
    return createProxyResponse(data, 300);
  } catch (error) {
    console.error('Error fetching DEX data:', error);
    return createErrorResponse('Failed to fetch DEX data');
  }
}

export async function OPTIONS() {
  return createOptionsResponse();
}