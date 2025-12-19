-- ShortWhats Database Schema
-- PostgreSQL (Neon compatible)
-- Run this script to create the initial database structure

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- LINKS TABLE
-- Main table storing all link/microlanding data
-- =====================================================
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

-- Index for fast slug lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_links_slug ON links(slug);
CREATE INDEX IF NOT EXISTS idx_links_created_at ON links(created_at DESC);

-- =====================================================
-- MICROLANDING CONFIG TABLE
-- Stores microlanding visual configuration
-- =====================================================
CREATE TABLE IF NOT EXISTS microlanding_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    link_id UUID NOT NULL UNIQUE REFERENCES links(id) ON DELETE CASCADE,
    
    -- Toggle flags
    show_logo BOOLEAN DEFAULT true,
    show_image BOOLEAN DEFAULT true,
    show_header_text BOOLEAN DEFAULT true,
    show_subheader_text BOOLEAN DEFAULT true,
    show_footer_text BOOLEAN DEFAULT true,
    
    -- Media URLs
    logo_url TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    
    -- Logo configuration
    logo_size VARCHAR(20) DEFAULT 'large' CHECK (logo_size IN ('small', 'medium', 'large', 'xlarge', 'xxlarge', 'xxxlarge')),
    logo_glassmorphism BOOLEAN DEFAULT false,
    logo_glass_opacity INTEGER DEFAULT 20 CHECK (logo_glass_opacity >= 0 AND logo_glass_opacity <= 100),
    logo_vertical_position INTEGER DEFAULT 0,
    
    -- Text content
    header_text VARCHAR(255) DEFAULT 'Activos en este momento',
    subheader_text VARCHAR(255) DEFAULT 'Reclama tu Bono del 100%',
    title VARCHAR(255) DEFAULT 'Contáctanos',
    description TEXT DEFAULT 'Escríbenos apretando el botón de abajo',
    description_bold BOOLEAN DEFAULT false,
    description_underline BOOLEAN DEFAULT false,
    footer_text VARCHAR(255) DEFAULT 'Solo para mayores de 18 años',
    footer_text_size INTEGER DEFAULT 18,
    
    -- Button configuration
    button_text VARCHAR(100) DEFAULT 'WHATSAPP OFICIAL',
    button_icon VARCHAR(20) DEFAULT 'whatsapp' CHECK (button_icon IN ('whatsapp', 'phone', 'message', 'none')),
    button_border_radius INTEGER DEFAULT 25,
    
    -- Colors (stored as hex strings)
    color_primary VARCHAR(9) DEFAULT '#4CAF50',
    color_background VARCHAR(9) DEFAULT '#0A1628',
    color_text VARCHAR(9) DEFAULT '#FFFFFF',
    color_button_background VARCHAR(9) DEFAULT '#25D366',
    color_button_text VARCHAR(9) DEFAULT '#FFFFFF',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- FACEBOOK PIXEL CONFIG TABLE
-- Stores Facebook Pixel tracking configuration
-- =====================================================
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

-- =====================================================
-- ADMIN CREDENTIALS TABLE
-- Stores admin login credentials (hashed passwords)
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- FILE UPLOADS TABLE
-- Tracks uploaded files for cleanup and management
-- =====================================================
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

-- =====================================================
-- BOT DETECTIONS TABLE
-- Stores records of detected bot activity for analysis
-- =====================================================
CREATE TABLE IF NOT EXISTS bot_detections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Request info
    ip_address VARCHAR(45) NOT NULL,
    slug VARCHAR(255),
    user_agent TEXT,
    
    -- Detection details
    detection_type VARCHAR(50) NOT NULL,
    recaptcha_score DECIMAL(3,2),
    client_bot_score DECIMAL(3,2),
    is_webdriver BOOLEAN DEFAULT false,
    error_message TEXT,
    
    -- Metadata
    request_headers JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_detections_ip ON bot_detections(ip_address);
CREATE INDEX IF NOT EXISTS idx_bot_detections_created_at ON bot_detections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_detections_type ON bot_detections(detection_type);
CREATE INDEX IF NOT EXISTS idx_bot_detections_slug ON bot_detections(slug);

-- =====================================================
-- UPDATED_AT TRIGGER FUNCTION
-- Automatically updates the updated_at column
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_links_updated_at
    BEFORE UPDATE ON links
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_microlanding_configs_updated_at
    BEFORE UPDATE ON microlanding_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facebook_pixel_configs_updated_at
    BEFORE UPDATE ON facebook_pixel_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_credentials_updated_at
    BEFORE UPDATE ON admin_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEWS FOR EASY QUERYING
-- =====================================================

-- Complete link view with all related data
CREATE OR REPLACE VIEW links_complete AS
SELECT 
    l.id,
    l.slug,
    l.phone_number,
    l.message,
    l.type,
    l.clicks,
    l.tags,
    l.created_at,
    l.updated_at,
    
    -- Microlanding config as JSON
    CASE WHEN mc.id IS NOT NULL THEN
        jsonb_build_object(
            'showLogo', mc.show_logo,
            'showImage', mc.show_image,
            'showHeaderText', mc.show_header_text,
            'showSubheaderText', mc.show_subheader_text,
            'showFooterText', mc.show_footer_text,
            'logoUrl', mc.logo_url,
            'imageUrl', mc.image_url,
            'logoSize', mc.logo_size,
            'logoGlassmorphism', mc.logo_glassmorphism,
            'logoGlassOpacity', mc.logo_glass_opacity,
            'logoVerticalPosition', mc.logo_vertical_position,
            'headerText', mc.header_text,
            'subheaderText', mc.subheader_text,
            'title', mc.title,
            'description', mc.description,
            'descriptionBold', mc.description_bold,
            'descriptionUnderline', mc.description_underline,
            'footerText', mc.footer_text,
            'footerTextSize', mc.footer_text_size,
            'buttonText', mc.button_text,
            'buttonIcon', mc.button_icon,
            'buttonBorderRadius', mc.button_border_radius,
            'colors', jsonb_build_object(
                'primary', mc.color_primary,
                'background', mc.color_background,
                'text', mc.color_text,
                'buttonBackground', mc.color_button_background,
                'buttonText', mc.color_button_text
            )
        )
    ELSE NULL END AS microlanding_config,
    
    -- Facebook Pixel config as JSON
    CASE WHEN fp.id IS NOT NULL THEN
        jsonb_build_object(
            'pixelId', fp.pixel_id,
            'viewContentEvent', fp.view_content_event,
            'leadEvent', fp.lead_event,
            'customEvents', fp.custom_events
        )
    ELSE NULL END AS facebook_pixel

FROM links l
LEFT JOIN microlanding_configs mc ON mc.link_id = l.id
LEFT JOIN facebook_pixel_configs fp ON fp.link_id = l.id;

-- =====================================================
-- SEED DATA (Optional - default admin)
-- Password: 123whats123 (bcrypt hashed)
-- =====================================================
-- INSERT INTO admin_credentials (username, password_hash)
-- VALUES ('admin', '$2b$10$rQZ8K.example.hash.here')
-- ON CONFLICT (username) DO NOTHING;
