-- Migration 001: Initial Schema
-- Created: 2024
-- Description: Creates the initial database structure for ShortWhats

-- This is the same as schema.sql but structured as a migration
-- Run with: psql $DATABASE_URL -f 001_initial_schema.sql

BEGIN;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Links table
CREATE TABLE IF NOT EXISTS links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(255) NOT NULL UNIQUE,
    phone_number VARCHAR(50) NOT NULL,
    message TEXT DEFAULT '',
    type VARCHAR(20) NOT NULL DEFAULT 'redirect' CHECK (type IN ('redirect', 'microlanding')),
    clicks INTEGER NOT NULL DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_links_slug ON links(slug);
CREATE INDEX IF NOT EXISTS idx_links_created_at ON links(created_at DESC);

-- Microlanding configs table
CREATE TABLE IF NOT EXISTS microlanding_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    link_id UUID NOT NULL UNIQUE REFERENCES links(id) ON DELETE CASCADE,
    show_logo BOOLEAN DEFAULT true,
    show_image BOOLEAN DEFAULT true,
    show_header_text BOOLEAN DEFAULT true,
    show_subheader_text BOOLEAN DEFAULT true,
    show_footer_text BOOLEAN DEFAULT true,
    logo_url TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    logo_size VARCHAR(20) DEFAULT 'large',
    logo_glassmorphism BOOLEAN DEFAULT false,
    logo_glass_opacity INTEGER DEFAULT 20,
    logo_vertical_position INTEGER DEFAULT 0,
    header_text VARCHAR(255) DEFAULT 'Activos en este momento',
    subheader_text VARCHAR(255) DEFAULT 'Reclama tu Bono del 100%',
    title VARCHAR(255) DEFAULT 'Contáctanos',
    description TEXT DEFAULT 'Escríbenos apretando el botón de abajo',
    description_bold BOOLEAN DEFAULT false,
    description_underline BOOLEAN DEFAULT false,
    footer_text VARCHAR(255) DEFAULT 'Solo para mayores de 18 años',
    footer_text_size INTEGER DEFAULT 18,
    button_text VARCHAR(100) DEFAULT 'WHATSAPP OFICIAL',
    button_icon VARCHAR(20) DEFAULT 'whatsapp',
    button_border_radius INTEGER DEFAULT 25,
    color_primary VARCHAR(9) DEFAULT '#4CAF50',
    color_background VARCHAR(9) DEFAULT '#0A1628',
    color_text VARCHAR(9) DEFAULT '#FFFFFF',
    color_button_background VARCHAR(9) DEFAULT '#25D366',
    color_button_text VARCHAR(9) DEFAULT '#FFFFFF',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Facebook Pixel configs table
CREATE TABLE IF NOT EXISTS facebook_pixel_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    link_id UUID NOT NULL UNIQUE REFERENCES links(id) ON DELETE CASCADE,
    pixel_id VARCHAR(50) DEFAULT '',
    view_content_event BOOLEAN DEFAULT true,
    lead_event BOOLEAN DEFAULT true,
    custom_events TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin credentials table
CREATE TABLE IF NOT EXISTS admin_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- File uploads table
CREATE TABLE IF NOT EXISTS file_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by UUID REFERENCES admin_credentials(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_file_uploads_created_at ON file_uploads(created_at DESC);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_links_updated_at') THEN
        CREATE TRIGGER update_links_updated_at
            BEFORE UPDATE ON links
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_microlanding_configs_updated_at') THEN
        CREATE TRIGGER update_microlanding_configs_updated_at
            BEFORE UPDATE ON microlanding_configs
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_facebook_pixel_configs_updated_at') THEN
        CREATE TRIGGER update_facebook_pixel_configs_updated_at
            BEFORE UPDATE ON facebook_pixel_configs
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_admin_credentials_updated_at') THEN
        CREATE TRIGGER update_admin_credentials_updated_at
            BEFORE UPDATE ON admin_credentials
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Record this migration
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(50) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO schema_migrations (version) VALUES ('001_initial_schema')
ON CONFLICT (version) DO NOTHING;

COMMIT;
