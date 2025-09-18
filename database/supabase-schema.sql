    -- DeFi Dashboard Database Schema for Supabase
    -- Drop existing tables if they exist (be careful in production!)
    DROP TABLE IF EXISTS pool_daily_snapshots CASCADE;
    DROP TABLE IF EXISTS protocol_daily_snapshots CASCADE;
    DROP TABLE IF EXISTS pools CASCADE;
    DROP TABLE IF EXISTS protocols CASCADE;
    DROP TABLE IF EXISTS sync_jobs CASCADE;

    -- Protocols table (DeFi protocols like Uniswap, Aave, etc.)
    CREATE TABLE protocols (
        id SERIAL PRIMARY KEY,
        defillama_id VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        tvl_usd NUMERIC(20, 2),
        change_1d NUMERIC(10, 2),
        change_7d NUMERIC(10, 2),
        chains TEXT[], -- Array of chains this protocol operates on
        category VARCHAR(100),
        url TEXT,
        logo TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Pools table (Individual liquidity pools)
    CREATE TABLE pools (
        id SERIAL PRIMARY KEY,
        defillama_pool_id VARCHAR(500) UNIQUE NOT NULL,
        symbol VARCHAR(255),
        chain VARCHAR(100),
        project VARCHAR(255),
        tvl_usd NUMERIC(20, 2),
        apy NUMERIC(10, 2),
        apy_base NUMERIC(10, 2),
        apy_reward NUMERIC(10, 2),
        apy_mean_30d NUMERIC(10, 2),
        volume_usd_1d NUMERIC(20, 2),
        volume_usd_7d NUMERIC(20, 2),
        contract_address VARCHAR(255),
        stablecoin BOOLEAN DEFAULT false,
        il_risk VARCHAR(50),
        exposure VARCHAR(100),
        pool_meta TEXT,
        underlying_tokens TEXT[],
        url TEXT,
        mu NUMERIC(10, 4),
        sigma NUMERIC(10, 4),
        count INTEGER,
        outlier BOOLEAN DEFAULT false,
        inception DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Pool daily snapshots for historical tracking
    CREATE TABLE pool_daily_snapshots (
        id SERIAL PRIMARY KEY,
        pool_id INTEGER REFERENCES pools(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        tvl_usd NUMERIC(20, 2),
        apy NUMERIC(10, 2),
        apy_base NUMERIC(10, 2),
        apy_reward NUMERIC(10, 2),
        volume_24h NUMERIC(20, 2),
        fees_24h NUMERIC(20, 2),
        token_balances JSONB, -- Store token balances as JSON
        token_prices_usd JSONB, -- Store token prices as JSON
        token_weights JSONB, -- Store token weights as JSON
        impermanent_loss_24h NUMERIC(10, 4),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(pool_id, date)
    );

    -- Protocol daily snapshots for historical tracking
    CREATE TABLE protocol_daily_snapshots (
        id SERIAL PRIMARY KEY,
        protocol_id INTEGER REFERENCES protocols(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        tvl_usd NUMERIC(20, 2),
        mcap_usd NUMERIC(20, 2),
        token_price NUMERIC(20, 8),
        volume_24h NUMERIC(20, 2),
        fees_24h NUMERIC(20, 2),
        revenue_24h NUMERIC(20, 2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(protocol_id, date)
    );

    -- Sync jobs tracking
    CREATE TABLE sync_jobs (
        id SERIAL PRIMARY KEY,
        job_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        error_message TEXT,
        records_processed INTEGER DEFAULT 0,
        duration_seconds INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for performance
    CREATE INDEX idx_protocols_defillama_id ON protocols(defillama_id);
    CREATE INDEX idx_protocols_slug ON protocols(slug);
    CREATE INDEX idx_protocols_tvl ON protocols(tvl_usd DESC);
    CREATE INDEX idx_protocols_updated ON protocols(updated_at DESC);

    CREATE INDEX idx_pools_defillama_id ON pools(defillama_pool_id);
    CREATE INDEX idx_pools_chain ON pools(chain);
    CREATE INDEX idx_pools_project ON pools(project);
    CREATE INDEX idx_pools_tvl ON pools(tvl_usd DESC);
    CREATE INDEX idx_pools_apy ON pools(apy DESC);
    CREATE INDEX idx_pools_contract ON pools(contract_address);
    CREATE INDEX idx_pools_updated ON pools(updated_at DESC);

    CREATE INDEX idx_pool_snapshots_pool_date ON pool_daily_snapshots(pool_id, date DESC);
    CREATE INDEX idx_pool_snapshots_date ON pool_daily_snapshots(date DESC);

    CREATE INDEX idx_protocol_snapshots_protocol_date ON protocol_daily_snapshots(protocol_id, date DESC);
    CREATE INDEX idx_protocol_snapshots_date ON protocol_daily_snapshots(date DESC);

    CREATE INDEX idx_sync_jobs_type_status ON sync_jobs(job_type, status);
    CREATE INDEX idx_sync_jobs_created ON sync_jobs(created_at DESC);

    -- Create updated_at trigger function
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    -- Add triggers to auto-update updated_at
    CREATE TRIGGER update_protocols_updated_at BEFORE UPDATE ON protocols
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    CREATE TRIGGER update_pools_updated_at BEFORE UPDATE ON pools
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    -- Grant permissions (adjust as needed for your Supabase setup)
    -- These are usually handled by Supabase RLS policies
    GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
    GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres;

    -- Add some helpful comments
    COMMENT ON TABLE protocols IS 'DeFi protocols tracked from DeFiLlama';
    COMMENT ON TABLE pools IS 'Individual liquidity pools with current metrics';
    COMMENT ON TABLE pool_daily_snapshots IS 'Historical daily snapshots of pool metrics';
    COMMENT ON TABLE protocol_daily_snapshots IS 'Historical daily snapshots of protocol metrics';
    COMMENT ON TABLE sync_jobs IS 'Track background job execution status';

    -- Insert sample sync job for testing
    INSERT INTO sync_jobs (job_type, status, completed_at, records_processed)
    VALUES ('test', 'completed', CURRENT_TIMESTAMP, 0);