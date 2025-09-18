/**
 * Sync Protocols API Route
 * Fetches protocols from DeFiLlama and stores them in the database
 */

import { NextResponse } from 'next/server';
import { batchUpsertProtocols, createSyncJob, updateSyncJob } from '@/lib/database';

export async function POST() {
  let jobId: number | null = null;

  try {
    // Create a sync job
    const job = await createSyncJob('protocols-sync');
    jobId = job?.id || null;

    // Fetch protocols from DeFiLlama
    console.log('Fetching protocols from DeFiLlama...');
    const response = await fetch('https://api.llama.fi/protocols', {
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch protocols: ${response.statusText}`);
    }

    const protocols = await response.json();

    // Map protocols to our database schema
    const mappedProtocols = protocols.map((protocol: any) => ({
      defillama_id: protocol.id || protocol.slug,
      name: protocol.name,
      slug: protocol.slug,
      tvl_usd: protocol.tvl || 0,
      change_1d: protocol.change_1d,
      change_7d: protocol.change_7d,
      chains: protocol.chains || [],
      category: protocol.category,
      url: protocol.url,
      logo: protocol.logo
    }));

    console.log(`Found ${mappedProtocols.length} protocols`);

    // Batch upsert protocols to database
    const batchSize = 50;
    let totalProcessed = 0;

    for (let i = 0; i < mappedProtocols.length; i += batchSize) {
      const batch = mappedProtocols.slice(i, i + batchSize);
      await batchUpsertProtocols(batch);
      totalProcessed += batch.length;
      console.log(`Processed ${totalProcessed}/${mappedProtocols.length} protocols`);
    }

    // Update sync job as completed
    if (jobId) {
      await updateSyncJob(jobId, 'completed', totalProcessed);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${totalProcessed} protocols`,
      data: {
        jobId,
        protocolsProcessed: totalProcessed
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Protocol sync error:', error);

    // Update sync job as failed
    if (jobId) {
      await updateSyncJob(
        jobId,
        'failed',
        0,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    return NextResponse.json({
      success: false,
      message: 'Protocol sync failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}