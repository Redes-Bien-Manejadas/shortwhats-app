-- Bot Detections Table
-- Stores records of detected bot activity for analysis and monitoring

-- Use gen_random_uuid() which is built-in to PostgreSQL 13+
-- Alternatively, enable uuid-ossp: CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS bot_detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Request info
    ip_address VARCHAR(45) NOT NULL,  -- IPv6 can be up to 45 chars
    slug VARCHAR(255),                 -- The link slug they tried to access
    user_agent TEXT,                   -- Browser user agent string
    
    -- Detection details
    detection_type VARCHAR(50) NOT NULL,  -- 'recaptcha', 'webdriver', 'rate_limit'
    recaptcha_score DECIMAL(3,2),         -- Score from 0.00 to 1.00
    client_bot_score DECIMAL(3,2),        -- Client-side detection score
    is_webdriver BOOLEAN DEFAULT false,
    error_message TEXT,                   -- Any error details
    
    -- Metadata
    request_headers JSONB,                -- Store relevant headers for analysis
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bot_detections_ip ON bot_detections(ip_address);
CREATE INDEX IF NOT EXISTS idx_bot_detections_created_at ON bot_detections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_detections_type ON bot_detections(detection_type);
CREATE INDEX IF NOT EXISTS idx_bot_detections_slug ON bot_detections(slug);
