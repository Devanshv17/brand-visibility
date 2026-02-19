-- Brand Visibility Hub - Database Schema (PostgreSQL)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================================================================
-- 1. Core Dimension Tables (Global Entities)
-- ==================================================================

-- Brands/Companies being audited
CREATE TABLE companies (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL UNIQUE,          -- e.g., 'Ben''s Original'
    slug        TEXT NOT NULL UNIQUE,          -- e.g., 'bens-original'
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Product Categories (Hierarchical)
CREATE TABLE categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL UNIQUE,          -- e.g., 'Dry Dog Food'
    slug        TEXT NOT NULL UNIQUE,
    parent_id   UUID REFERENCES categories(id),
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Buyer Personas
CREATE TABLE personas (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL UNIQUE,          -- e.g., 'Picky-Eater Dog Parent'
    slug        TEXT NOT NULL UNIQUE,
    description TEXT,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- AI Platforms (Sources)
CREATE TABLE platforms (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL UNIQUE,          -- e.g., 'Rufus', 'ChatGPT'
    base_url    TEXT,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Programs/Audits (The "Setup")
CREATE TABLE audits (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id  UUID NOT NULL REFERENCES companies(id),
    category_id UUID NOT NULL REFERENCES categories(id),
    platform_id UUID NOT NULL REFERENCES platforms(id),
    name        TEXT,                          -- e.g., 'Ben''s UK Q1 2026'
    region      TEXT DEFAULT 'US',
    status      TEXT DEFAULT 'active',         -- active, archived
    config      JSONB DEFAULT '{}',            -- Scraper settings
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Audit Target Personas mapping
CREATE TABLE audit_personas (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id    UUID NOT NULL REFERENCES audits(id),
    persona_id  UUID NOT NULL REFERENCES personas(id),
    UNIQUE(audit_id, persona_id)
);

-- ==================================================================
-- 2. The Question Bank (Deduplicated)
-- ==================================================================

CREATE TABLE questions (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    text                   TEXT NOT NULL,
    -- Deterministic hash for deduplication
    text_hash              TEXT GENERATED ALWAYS AS (md5(lower(trim(text)))) STORED,
    commerce_stage_primary TEXT,              -- discovery, evaluation, conversion
    commerce_stage_secondary TEXT,
    priority               TEXT,              -- high, medium, low
    monthly_volume         INT,
    metadata               JSONB DEFAULT '{}',
    created_at             TIMESTAMPTZ DEFAULT now(),
    UNIQUE(text_hash)
);

-- Mappings to Categories/Personas (Many-to-Many)
CREATE TABLE question_category_map (
    question_id  UUID REFERENCES questions(id),
    category_id  UUID REFERENCES categories(id),
    PRIMARY KEY (question_id, category_id)
);

CREATE TABLE question_persona_map (
    question_id  UUID REFERENCES questions(id),
    persona_id   UUID REFERENCES personas(id),
    PRIMARY KEY (question_id, persona_id)
);

-- Conversations (Threads within an Audit)
CREATE TABLE conversations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_persona_id UUID NOT NULL REFERENCES audit_personas(id),
    topic           TEXT,
    thread_index    INT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Conversation Turns (Ordered Q&A slots)
CREATE TABLE conversation_turns (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id),
    question_id     UUID NOT NULL REFERENCES questions(id),
    turn_index      INT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(conversation_id, turn_index)
);

-- ==================================================================
-- 3. Products & Findings (Deduplicated)
-- ==================================================================

CREATE TABLE products (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asin        TEXT UNIQUE,                   -- The global dedup key
    name        TEXT NOT NULL,
    brand       TEXT,
    url         TEXT,
    image_url   TEXT,
    metadata    JSONB DEFAULT '{}',            -- price, rating, reviews
    first_seen  TIMESTAMPTZ DEFAULT now(),
    last_seen   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE suggested_questions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    text        TEXT NOT NULL,
    text_hash   TEXT GENERATED ALWAYS AS (md5(lower(trim(text)))) STORED,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(text_hash)
);

-- ==================================================================
-- 4. Runs & Snapshots (The Execution Log)
-- ==================================================================

CREATE TABLE runs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_id    UUID NOT NULL REFERENCES audits(id),
    run_number  INT NOT NULL,
    run_date    DATE NOT NULL,
    status      TEXT DEFAULT 'completed',
    config      JSONB DEFAULT '{}',
    started_at  TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE(audit_id, run_number, run_date)
);

-- The actual AI response content (Partitioned by Month for scale)
CREATE TABLE run_turn_snapshots (
    id                  UUID DEFAULT uuid_generate_v4(),
    run_id              UUID NOT NULL REFERENCES runs(id),
    conversation_turn_id UUID NOT NULL REFERENCES conversation_turns(id),
    
    answer_text         TEXT,
    answer_metadata     JSONB DEFAULT '{}',    -- latency, token_usage
    
    created_at          TIMESTAMPTZ DEFAULT now(),
    -- Composite PK for partitioning
    PRIMARY KEY (id, created_at),
    UNIQUE(run_id, conversation_turn_id, created_at)
) PARTITION BY RANGE (created_at);

-- Example Partition
CREATE TABLE run_turn_snapshots_2026_02 PARTITION OF run_turn_snapshots
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Products mentioned in a snapshot
CREATE TABLE snapshot_products (
    snapshot_id  UUID,                         -- logical FK to run_turn_snapshots
    snapshot_date TIMESTAMPTZ,                 -- needed for partition pruning
    product_id   UUID REFERENCES products(id),
    rank         INT,
    citation_text TEXT,
    PRIMARY KEY (snapshot_id, product_id)
);

-- Suggested questions in a snapshot
CREATE TABLE snapshot_suggested_questions (
    snapshot_id           UUID,
    snapshot_date         TIMESTAMPTZ,
    suggested_question_id UUID REFERENCES suggested_questions(id),
    rank                  INT,
    PRIMARY KEY (snapshot_id, suggested_question_id)
);

-- ==================================================================
-- 5. Performance Indexes
-- ==================================================================

CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_runs_date ON runs(run_date);
CREATE INDEX idx_questions_text_search ON questions USING gin(to_tsvector('english', text));

-- ==================================================================
-- 6. Analytics Views (Materialized)
-- ==================================================================

-- Re-run this periodically to update dashboard
CREATE MATERIALIZED VIEW mv_dashboard_stats AS
SELECT 
    c.name as company,
    r.run_date,
    COUNT(DISTINCT r.id) as total_runs,
    COUNT(DISTINCT sp.product_id) as unique_products_suggested
FROM companies c
JOIN audits a ON a.company_id = c.id
JOIN runs r ON r.audit_id = a.id
JOIN run_turn_snapshots rts ON rts.run_id = r.id
LEFT JOIN snapshot_products sp ON sp.snapshot_id = rts.id
GROUP BY c.name, r.run_date;

CREATE UNIQUE INDEX idx_mv_dashboard_stats ON mv_dashboard_stats(company, run_date);
