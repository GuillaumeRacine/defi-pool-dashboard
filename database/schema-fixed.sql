-- DeFi Data Warehouse Schema - Fixed Version
-- Run this in Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ============================================================================
-- CORE ENTITIES
-- ============================================================================

-- Blockchain networks
CREATE TABLE chains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    defillama_name VARCHAR NOT NULL UNIQUE,
    chain_id INTEGER,
    name VARCHAR NOT NULL,
    native_token VARCHAR,
    rpc_urls JSONB,
    block_explorers JSONB,
    tvl_usd DECIMAL(20,2),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- DeFi protocols (projects)
CREATE TABLE protocols (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    defillama_id VARCHAR UNIQUE NOT NULL,
    name VARCHAR NOT NULL,
    display_name VARCHAR,
    slug VARCHAR,
    category VARCHAR,
    protocol_type VARCHAR,
    chains VARCHAR[],
    description TEXT,
    logo_url VARCHAR,
    website_url VARCHAR,
    twitter_handle VARCHAR,
    methodology JSONB,
    methodology_url VARCHAR,
    tvl_usd DECIMAL(20,2),
    total_24h DECIMAL(20,2),
    total_7d DECIMAL(20,2),
    total_30d DECIMAL(20,2),
    change_1d DECIMAL(8,4),
    change_7d DECIMAL(8,4),
    change_1m DECIMAL(8,4),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Liquidity pools and yield opportunities
CREATE TABLE pools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    defillama_pool_id VARCHAR UNIQUE NOT NULL,
    protocol_id UUID REFERENCES protocols(id),
    chain VARCHAR NOT NULL,
    project VARCHAR NOT NULL,
    symbol VARCHAR,
    pool_name VARCHAR,

    -- Key mapping fields
    contract_address VARCHAR,
    factory_address VARCHAR,
    router_address VARCHAR,

    -- Pool composition
    underlying_tokens JSONB,
    token_symbols JSONB,
    token_decimals JSONB,
    pool_tokens JSONB,

    -- Financial metrics
    tvl_usd DECIMAL(20,2),
    apy DECIMAL(8,4),
    apy_base DECIMAL(8,4),
    apy_reward DECIMAL(8,4),
    apy_mean_30d DECIMAL(8,4),
    il_risk VARCHAR,
    il_7d DECIMAL(8,4),

    -- Pool metadata
    pool_type VARCHAR,
    fee_tier DECIMAL(8,6),
    stable_pool BOOLEAN DEFAULT FALSE,
    exposure VARCHAR,

    -- Data quality
    pool_meta JSONB,
    predictions JSONB,
    confidence_score DECIMAL(3,2),
    search_vector tsvector,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Contract address mappings
CREATE TABLE contract_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Source mapping
    defillama_pool_id VARCHAR NOT NULL,
    chain VARCHAR NOT NULL,
    protocol VARCHAR NOT NULL,

    -- Contract details
    contract_address VARCHAR NOT NULL,
    contract_type VARCHAR NOT NULL,
    contract_standard VARCHAR,

    -- Verification and confidence
    verified BOOLEAN DEFAULT FALSE,
    verification_method VARCHAR,
    confidence_score DECIMAL(3,2),
    verified_at TIMESTAMP,
    verified_by VARCHAR,

    -- Data sources
    data_sources JSONB,
    source_metadata JSONB,

    -- Contract metadata
    name VARCHAR,
    symbol VARCHAR,
    decimals INTEGER,
    total_supply DECIMAL(30,0),
    contract_creator VARCHAR,
    creation_block BIGINT,
    creation_timestamp TIMESTAMP,

    -- Business logic
    is_active BOOLEAN DEFAULT TRUE,
    last_activity_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(defillama_pool_id, contract_address, contract_type)
);

-- ============================================================================
-- TIME SERIES DATA
-- ============================================================================

-- Daily snapshots for historical analysis
CREATE TABLE pool_daily_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pool_id UUID REFERENCES pools(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    -- Financial metrics snapshot
    tvl_usd DECIMAL(20,2),
    apy DECIMAL(8,4),
    apy_base DECIMAL(8,4),
    apy_reward DECIMAL(8,4),
    volume_24h DECIMAL(20,2),
    fees_24h DECIMAL(20,2),

    -- Token composition tracking
    token_balances JSONB,
    token_prices_usd JSONB,
    token_weights JSONB,

    -- Calculated metrics
    impermanent_loss_24h DECIMAL(8,4),
    sharpe_ratio DECIMAL(8,4),
    volatility DECIMAL(8,4),

    -- Data quality
    data_completeness DECIMAL(3,2),
    anomaly_flags JSONB,

    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(pool_id, date)
);

-- Protocol daily aggregates
CREATE TABLE protocol_daily_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    protocol_id UUID REFERENCES protocols(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    tvl_usd DECIMAL(20,2),
    volume_24h DECIMAL(20,2),
    fees_24h DECIMAL(20,2),
    revenue_24h DECIMAL(20,2),
    users_24h INTEGER,
    transactions_24h INTEGER,

    chain_tvl_breakdown JSONB,
    chain_volume_breakdown JSONB,

    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(protocol_id, date)
);

-- ============================================================================
-- SYNC JOB TRACKING
-- ============================================================================

CREATE TABLE sync_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_name VARCHAR NOT NULL,
    job_type VARCHAR NOT NULL,
    status VARCHAR NOT NULL,

    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER,

    records_processed INTEGER,
    records_created INTEGER,
    records_updated INTEGER,
    records_failed INTEGER,

    error_message TEXT,
    error_details JSONB,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    source_endpoints JSONB,
    api_calls_made INTEGER,
    api_rate_limit_hits INTEGER,

    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Pools indexes
CREATE INDEX idx_pools_chain ON pools(chain);
CREATE INDEX idx_pools_protocol ON pools(protocol_id);
CREATE INDEX idx_pools_tvl ON pools(tvl_usd DESC);
CREATE INDEX idx_pools_apy ON pools(apy DESC);
CREATE INDEX idx_pools_contract_address ON pools(contract_address);
CREATE INDEX idx_pools_underlying_tokens ON pools USING GIN(underlying_tokens);
CREATE INDEX idx_pools_updated_at ON pools(updated_at);

-- Contract mappings indexes
CREATE INDEX idx_contract_mappings_defillama_id ON contract_mappings(defillama_pool_id);
CREATE INDEX idx_contract_mappings_address ON contract_mappings(contract_address);
CREATE INDEX idx_contract_mappings_chain ON contract_mappings(chain);
CREATE INDEX idx_contract_mappings_type ON contract_mappings(contract_type);
CREATE INDEX idx_contract_mappings_verified ON contract_mappings(verified, confidence_score DESC);

-- Time series indexes
CREATE INDEX idx_pool_snapshots_pool_date ON pool_daily_snapshots(pool_id, date DESC);
CREATE INDEX idx_pool_snapshots_date ON pool_daily_snapshots(date DESC);
CREATE INDEX idx_protocol_snapshots_protocol_date ON protocol_daily_snapshots(protocol_id, date DESC);

-- Sync jobs indexes
CREATE INDEX idx_sync_jobs_status ON sync_jobs(status, created_at DESC);
CREATE INDEX idx_sync_jobs_job_type ON sync_jobs(job_type, created_at DESC);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_chains_updated_at BEFORE UPDATE ON chains FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_protocols_updated_at BEFORE UPDATE ON protocols FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pools_updated_at BEFORE UPDATE ON pools FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contract_mappings_updated_at BEFORE UPDATE ON contract_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Search vector update trigger for pools
CREATE OR REPLACE FUNCTION update_pools_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english',
        COALESCE(NEW.symbol, '') || ' ' ||
        COALESCE(NEW.pool_name, '') || ' ' ||
        COALESCE(NEW.project, '') || ' ' ||
        COALESCE(NEW.chain, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pools_search_vector
    BEFORE INSERT OR UPDATE ON pools
    FOR EACH ROW EXECUTE FUNCTION update_pools_search_vector();

-- ============================================================================
-- USEFUL VIEWS
-- ============================================================================

-- Top pools by TVL with contract mappings
CREATE OR REPLACE VIEW v_top_pools_with_contracts AS
SELECT
    p.*,
    cm.contract_address,
    cm.contract_type,
    cm.verified,
    cm.confidence_score as mapping_confidence
FROM pools p
LEFT JOIN contract_mappings cm ON p.defillama_pool_id = cm.defillama_pool_id
    AND cm.contract_type = 'pool'
    AND cm.is_active = true
WHERE p.tvl_usd > 1000000
ORDER BY p.tvl_usd DESC;

-- Protocol summary with pool counts
CREATE OR REPLACE VIEW v_protocol_summary AS
SELECT
    pr.*,
    COUNT(p.id) as pool_count,
    SUM(p.tvl_usd) as total_pool_tvl,
    AVG(p.apy) as avg_apy,
    COUNT(cm.id) as mapped_contracts_count
FROM protocols pr
LEFT JOIN pools p ON pr.id = p.protocol_id
LEFT JOIN contract_mappings cm ON p.defillama_pool_id = cm.defillama_pool_id
GROUP BY pr.id;

-- Recent sync job status
CREATE OR REPLACE VIEW v_sync_status AS
SELECT
    job_type,
    status,
    COUNT(*) as job_count,
    MAX(completed_at) as last_completed,
    AVG(duration_seconds) as avg_duration_seconds,
    SUM(records_processed) as total_records_processed
FROM sync_jobs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY job_type, status
ORDER BY job_type, status;