/**
 * Migration Script: PHP JSON API → PostgreSQL Database (Neon)
 * 
 * This script migrates existing data from the old PHP JSON file-based storage
 * to the new PostgreSQL database hosted on Neon.
 * 
 * Usage:
 *   1. Set DATABASE_URL environment variable (or it will use the hardcoded one)
 *   2. Run: npx tsx scripts/migrate-from-json.ts
 *   3. Optional flags:
 *      --force    : Update existing records instead of skipping them
 *      --dry-run  : Only fetch and display data, don't insert into DB
 * 
 * The script will:
 *   1. Fetch all links from the old PHP API (production)
 *   2. Save a local backup of the fetched data
 *   3. Insert/update them into the new PostgreSQL database
 *   4. Report success/failure for each link
 */

import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';

// Old PHP API URL (Production)
const OLD_API_URL = 'https://api.diversionconseguridad.com/api.php';
const FOLDER_NAME = 'whatsgrow_links';

// Parse command line arguments
const args = process.argv.slice(2);
const FORCE_UPDATE = args.includes('--force');
const DRY_RUN = args.includes('--dry-run');
const USE_LOCAL_BACKUP = args.includes('--local');
const LOCAL_BACKUP_FILE = args.find(a => a.startsWith('--file='))?.split('=')[1] || 'links_backup.json';

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
  // If --local flag is set, load from local backup file
  if (USE_LOCAL_BACKUP) {
    console.log(`📂 Loading from local backup file: ${LOCAL_BACKUP_FILE}`);
    const filePath = path.join(process.cwd(), LOCAL_BACKUP_FILE);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Backup file not found: ${filePath}`);
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    // Handle both formats: array directly or {success, data} object
    const links = Array.isArray(data) ? data : data.data;
    
    if (!Array.isArray(links)) {
      throw new Error('Invalid backup file format');
    }
    
    console.log(`✅ Loaded ${links.length} links from backup file`);
    return links;
  }
  
  // Fetch from PHP API
  console.log('📥 Fetching links from old PHP API...');
  console.log(`   URL: ${OLD_API_URL}?api=all&folder=${FOLDER_NAME}`);
  
  const response = await fetch(`${OLD_API_URL}?api=all&folder=${FOLDER_NAME}`);
  
  if (!response.ok) {
    console.error(`\n❌ PHP server returned ${response.status} error.`);
    console.error('   The old Hostinger server might be down.');
    console.error('   You can use the local backup instead:');
    console.error('   npx tsx scripts/migrate-from-json.ts --local --force\n');
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.success || !Array.isArray(data.data)) {
    console.error('API Response:', JSON.stringify(data, null, 2));
    throw new Error('Failed to fetch links from old API - invalid response format');
  }
  
  console.log(`✅ Found ${data.data.length} links to migrate`);
  
  // Save backup locally
  const backupPath = path.join(process.cwd(), `links_backup_${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(data.data, null, 2));
  console.log(`💾 Backup saved to: ${backupPath}`);
  
  return data.data;
}

async function migrateLink(sql: ReturnType<typeof neon>, link: OldLinkData): Promise<'created' | 'updated' | 'skipped' | 'failed'> {
  try {
    // Check if link already exists
    const existing = await sql`SELECT id FROM links WHERE slug = ${link.slug}`;
    
    if (existing.length > 0) {
      if (!FORCE_UPDATE) {
        console.log(`⏭️  Skipping ${link.slug} - already exists (use --force to update)`);
        return 'skipped';
      }
      
      // Update existing link
      const linkId = existing[0].id;
      console.log(`🔄 Updating ${link.slug}...`);
      
      await sql`
        UPDATE links SET
          phone_number = ${link.phoneNumber},
          message = ${link.message || ''},
          type = ${link.type},
          clicks = ${link.clicks || 0},
          tags = ${link.tags || []}
        WHERE id = ${linkId}
      `;
      
      // Update microlanding config
      const mc = link.microlandingConfig;
      if (mc) {
        await sql`
          UPDATE microlanding_configs SET
            show_logo = ${mc.showLogo ?? true},
            show_image = ${mc.showImage ?? true},
            show_header_text = ${mc.showHeaderText ?? true},
            show_subheader_text = ${mc.showSubheaderText ?? true},
            show_footer_text = ${mc.showFooterText ?? true},
            logo_url = ${mc.logoUrl || ''},
            image_url = ${mc.imageUrl || ''},
            logo_size = ${mc.logoSize || 'large'},
            logo_glassmorphism = ${mc.logoGlassmorphism ?? false},
            logo_glass_opacity = ${mc.logoGlassOpacity ?? 20},
            logo_vertical_position = ${mc.logoVerticalPosition ?? 0},
            header_text = ${mc.headerText || 'Activos en este momento'},
            subheader_text = ${mc.subheaderText || 'Reclama tu Bono del 100%'},
            title = ${mc.title || 'Contáctanos'},
            description = ${mc.description || 'Escríbenos apretando el botón de abajo'},
            description_bold = ${mc.descriptionBold ?? false},
            description_underline = ${mc.descriptionUnderline ?? false},
            footer_text = ${mc.footerText || 'Solo para mayores de 18 años'},
            footer_text_size = ${mc.footerTextSize ?? 18},
            button_text = ${mc.buttonText || 'WHATSAPP OFICIAL'},
            button_icon = ${mc.buttonIcon || 'whatsapp'},
            button_border_radius = ${mc.buttonBorderRadius ?? 25},
            color_primary = ${mc.colors?.primary || '#4CAF50'},
            color_background = ${mc.colors?.background || '#0A1628'},
            color_text = ${mc.colors?.text || '#FFFFFF'},
            color_button_background = ${mc.colors?.buttonBackground || '#25D366'},
            color_button_text = ${mc.colors?.buttonText || '#FFFFFF'}
          WHERE link_id = ${linkId}
        `;
      }
      
      // Update facebook pixel config
      const fp = link.facebookPixel;
      await sql`
        UPDATE facebook_pixel_configs SET
          pixel_id = ${fp?.pixelId || ''},
          view_content_event = ${fp?.viewContentEvent ?? true},
          lead_event = ${fp?.leadEvent ?? true},
          custom_events = ${fp?.customEvents || []}
        WHERE link_id = ${linkId}
      `;
      
      console.log(`✅ Updated: ${link.slug}`);
      return 'updated';
    }
    
    // Insert new link
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
    
    console.log(`✅ Created: ${link.slug}`);
    return 'created';
  } catch (error) {
    console.error(`❌ Failed to migrate ${link.slug}:`, error);
    return 'failed';
  }
}

async function main() {
  console.log('🚀 Starting migration from PHP JSON API to PostgreSQL (Neon)...\n');
  console.log('Options:');
  console.log(`  --force:   ${FORCE_UPDATE ? 'YES (will update existing records)' : 'NO (will skip existing records)'}`);
  console.log(`  --dry-run: ${DRY_RUN ? 'YES (no database changes)' : 'NO (will write to database)'}`);
  console.log(`  --local:   ${USE_LOCAL_BACKUP ? `YES (loading from ${LOCAL_BACKUP_FILE})` : 'NO (fetching from PHP API)'}`);
  console.log('');
  
  // Database URL - use environment variable or fallback to hardcoded
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_YVaLzU9xD3Mn@ep-quiet-snow-ac4s8u6f-pooler.sa-east-1.aws.neon.tech/shortwhats?sslmode=require&channel_binding=require';
  
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
  
  // Fetch old links from PHP API
  const links = await fetchOldLinks();
  
  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN - Showing first 3 links that would be migrated:\n');
    for (const link of links.slice(0, 3)) {
      console.log(`  - ${link.slug} (${link.type}, ${link.clicks} clicks)`);
      console.log(`    Phone: ${link.phoneNumber}`);
      console.log(`    Title: ${link.microlandingConfig?.title || 'N/A'}`);
      console.log('');
    }
    console.log(`... and ${links.length - 3} more links`);
    console.log('\n✅ Dry run complete. No changes made to database.');
    return;
  }
  
  // Migrate each link
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  
  console.log('\n📦 Migrating links...\n');
  
  for (const link of links) {
    const result = await migrateLink(sql, link);
    switch (result) {
      case 'created': createdCount++; break;
      case 'updated': updatedCount++; break;
      case 'skipped': skippedCount++; break;
      case 'failed': failedCount++; break;
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Migration Summary');
  console.log('='.repeat(50));
  console.log(`✅ Created:  ${createdCount}`);
  console.log(`🔄 Updated:  ${updatedCount}`);
  console.log(`⏭️  Skipped:  ${skippedCount}`);
  console.log(`❌ Failed:   ${failedCount}`);
  console.log(`📦 Total:    ${links.length}`);
  console.log('='.repeat(50));
  
  if (failedCount === 0) {
    console.log('\n🎉 Migration completed successfully!');
  } else {
    console.log('\n⚠️  Migration completed with some errors. Check the logs above.');
  }
}

main().catch(console.error);
