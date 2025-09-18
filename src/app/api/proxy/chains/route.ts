/**
 * API Proxy for DeFiLlama Chains Overview
 */

import { fetchFromDeFiLlama, createProxyResponse, createErrorResponse, createOptionsResponse } from '@/lib/api';

export async function GET() {
  try {
    const data = await fetchFromDeFiLlama('/chains', 300);
    return createProxyResponse(data, 300);
  } catch (error) {
    console.error('Error fetching chains data:', error);
    return createErrorResponse('Failed to fetch chains data');
  }
}

export async function OPTIONS() {
  return createOptionsResponse();
}