/**
 * Migration Script: JSON Files → PostgreSQL Database
 * 
 * This script migrates existing data from the PHP JSON file-based storage
 * to the new PostgreSQL database.
 * 
 * Usage:
 *   1. Set DATABASE_URL environment variable
 *   2. Run: npx tsx scripts/migrate-from-json.ts
 * 
 * The script will:
 *   1. Fetch all links from the old PHP API
 *   2. Insert them into the new PostgreSQL database
 *   3. Report success/failure for each link
 */

import { neon } from '@neondatabase/serverless';

// Old PHP API URL
const OLD_API_URL = 'https://api.diversionconseguridad.com/api.php';
const FOLDER_NAME = 'whatsgrow_links';

interface OldLinkData {
  id?: string;
  slug: string;
  phoneNumber: string;
  message: string;
  type: 'redirect' | 'microlanding';
  clicks: number;
  tags: string[];
  createdAt: string;
  microlandingConfig: {
    showLogo: boolean;
    showImage: boolean;
    showHeaderText: boolean;
    showSubheaderText: boolean;
    showFooterText: boolean;
    logoUrl: string;
    imageUrl: string;
    logoSize: string;
    logoGlassmorphism: boolean;
    logoGlassOpacity: number;
    logoVerticalPosition: number;
    headerText: string;
    subheaderText: string;
    title: string;
    description: string;
    descriptionBold: boolean;
    descriptionUnderline: boolean;
    footerText: string;
    footerTextSize: number;
    buttonText: string;
    buttonIcon: string;
    buttonBorderRadius: number;
    colors: {
      primary: string;
      background: string;
      text: string;
      buttonBackground: string;
      buttonText: string;
    };
  };
  facebookPixel?: {
    pixelId: string;
    viewContentEvent: boolean;
    leadEvent: boolean;
    customEvents: string[];
  };
}

async function fetchOldLinks(): Promise<OldLinkData[]> {
  console.log('📥 Fetching links from old PHP API...');
  
  const response = await fetch(`${OLD_API_URL}?api=all&folder=${FOLDER_NAME}`);
  const data = await response.json();
  
  if (!data.success || !Array.isArray(data.data)) {
    throw new Error('Failed to fetch links from old API');
  }
  
  console.log(`✅ Found ${data.data.length} links to migrate`);
  return data.data;
}

async function migrateLink(sql: ReturnType<typeof neon>, link: OldLinkData): Promise<boolean> {
  try {
    // Check if link already exists
    const existing = await sql`SELECT id FROM links WHERE slug = ${link.slug}`;
    if (existing.length > 0) {
      console.log(`⏭️  Skipping ${link.slug} - already exists`);
      return true;
    }
    
    // Insert link
    const linkResult = await sql`
      INSERT INTO links (slug, phone_number, message, type, clicks, tags, created_at)
      VALUES (
        ${link.slug},
        ${link.phoneNumber},
        ${link.message || ''},
        ${link.type},
        ${link.clicks || 0},
        ${link.tags || []},
        ${link.createdAt ? new Date(link.createdAt) : new Date()}
      )
      RETURNING id
    `;
    
    const linkId = linkResult[0].id;
    
    // Insert microlanding config
    const mc = link.microlandingConfig;
    if (mc) {
      await sql`
        INSERT INTO microlanding_configs (
          link_id, show_logo, show_image, show_header_text, show_subheader_text, show_footer_text,
          logo_url, image_url, logo_size, logo_glassmorphism, logo_glass_opacity, logo_vertical_position,
          header_text, subheader_text, title, description, description_bold, description_underline,
          footer_text, footer_text_size, button_text, button_icon, button_border_radius,
          color_primary, color_background, color_text, color_button_background, color_button_text
        )
        VALUES (
          ${linkId}, 
          ${mc.showLogo ?? true}, 
          ${mc.showImage ?? true}, 
          ${mc.showHeaderText ?? true}, 
          ${mc.showSubheaderText ?? true}, 
          ${mc.showFooterText ?? true},
          ${mc.logoUrl || ''}, 
          ${mc.imageUrl || ''}, 
          ${mc.logoSize || 'large'}, 
          ${mc.logoGlassmorphism ?? false}, 
          ${mc.logoGlassOpacity ?? 20}, 
          ${mc.logoVerticalPosition ?? 0},
          ${mc.headerText || 'Activos en este momento'}, 
          ${mc.subheaderText || 'Reclama tu Bono del 100%'}, 
          ${mc.title || 'Contáctanos'}, 
          ${mc.description || 'Escríbenos apretando el botón de abajo'}, 
          ${mc.descriptionBold ?? false}, 
          ${mc.descriptionUnderline ?? false},
          ${mc.footerText || 'Solo para mayores de 18 años'}, 
          ${mc.footerTextSize ?? 18}, 
          ${mc.buttonText || 'WHATSAPP OFICIAL'}, 
          ${mc.buttonIcon || 'whatsapp'}, 
          ${mc.buttonBorderRadius ?? 25},
          ${mc.colors?.primary || '#4CAF50'}, 
          ${mc.colors?.background || '#0A1628'}, 
          ${mc.colors?.text || '#FFFFFF'}, 
          ${mc.colors?.buttonBackground || '#25D366'}, 
          ${mc.colors?.buttonText || '#FFFFFF'}
        )
      `;
    }
    
    // Insert facebook pixel config
    const fp = link.facebookPixel;
    await sql`
      INSERT INTO facebook_pixel_configs (link_id, pixel_id, view_content_event, lead_event, custom_events)
      VALUES (
        ${linkId}, 
        ${fp?.pixelId || ''}, 
        ${fp?.viewContentEvent ?? true}, 
        ${fp?.leadEvent ?? true}, 
        ${fp?.customEvents || []}
      )
    `;
    
    console.log(`✅ Migrated: ${link.slug}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to migrate ${link.slug}:`, error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting migration from JSON to PostgreSQL...\n');
  
  // Check for DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.error('   Set it with: export DATABASE_URL="postgresql://..."');
    process.exit(1);
  }
  
  const sql = neon(databaseUrl);
  
  // Test database connection
  try {
    await sql`SELECT 1`;
    console.log('✅ Database connection successful\n');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }
  
  // Fetch old links
  const links = await fetchOldLinks();
  
  // Migrate each link
  let successCount = 0;
  let failCount = 0;
  
  console.log('\n📦 Migrating links...\n');
  
  for (const link of links) {
    const success = await migrateLink(sql, link);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Migration Summary');
  console.log('='.repeat(50));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📦 Total: ${links.length}`);
  console.log('='.repeat(50));
  
  if (failCount === 0) {
    console.log('\n🎉 Migration completed successfully!');
  } else {
    console.log('\n⚠️  Migration completed with some errors. Check the logs above.');
  }
}

main().catch(console.error);
