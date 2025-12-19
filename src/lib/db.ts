import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import type { LinkData, MicrolandingConfig, FacebookPixelConfig } from './types';

// Cache the SQL client to reuse connections
let sqlClient: NeonQueryFunction<false, false> | null = null;

// Get the SQL client (with connection reuse)
function getSQL(): NeonQueryFunction<false, false> {
  if (sqlClient) {
    return sqlClient;
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Create client with retry-friendly settings
  sqlClient = neon(databaseUrl);

  return sqlClient;
}

// =====================================================
// TYPE CONVERTERS
// =====================================================

interface DBLink {
  id: string;
  slug: string;
  phone_number: string;
  message: string;
  type: 'redirect' | 'microlanding';
  clicks: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// The view returns camelCase keys in the JSON objects
interface DBMicrolandingConfig {
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
}

interface DBFacebookPixelConfig {
  pixelId: string;
  viewContentEvent: boolean;
  leadEvent: boolean;
  customEvents: string[];
}

interface DBLinkComplete extends DBLink {
  microlanding_config: DBMicrolandingConfig | null;
  facebook_pixel: DBFacebookPixelConfig | null;
}

function dbToLinkData(row: DBLinkComplete): LinkData {
  // The view returns camelCase keys, so we can use them directly
  // But we need to apply defaults for missing values
  const mc = row.microlanding_config;
  const defaults = getDefaultMicrolandingConfig();

  const microlandingConfig: MicrolandingConfig = mc ? {
    showLogo: mc.showLogo ?? defaults.showLogo,
    showImage: mc.showImage ?? defaults.showImage,
    showHeaderText: mc.showHeaderText ?? defaults.showHeaderText,
    showSubheaderText: mc.showSubheaderText ?? defaults.showSubheaderText,
    showFooterText: mc.showFooterText ?? defaults.showFooterText,
    logoUrl: mc.logoUrl ?? defaults.logoUrl,
    imageUrl: mc.imageUrl ?? defaults.imageUrl,
    logoSize: (mc.logoSize as MicrolandingConfig['logoSize']) ?? defaults.logoSize,
    logoGlassmorphism: mc.logoGlassmorphism ?? defaults.logoGlassmorphism,
    logoGlassOpacity: mc.logoGlassOpacity ?? defaults.logoGlassOpacity,
    logoVerticalPosition: mc.logoVerticalPosition ?? defaults.logoVerticalPosition,
    headerText: mc.headerText ?? defaults.headerText,
    subheaderText: mc.subheaderText ?? defaults.subheaderText,
    title: mc.title ?? defaults.title,
    description: mc.description ?? defaults.description,
    descriptionBold: mc.descriptionBold ?? defaults.descriptionBold,
    descriptionUnderline: mc.descriptionUnderline ?? defaults.descriptionUnderline,
    footerText: mc.footerText ?? defaults.footerText,
    footerTextSize: mc.footerTextSize ?? defaults.footerTextSize,
    buttonText: mc.buttonText ?? defaults.buttonText,
    buttonIcon: (mc.buttonIcon as MicrolandingConfig['buttonIcon']) ?? defaults.buttonIcon,
    buttonBorderRadius: mc.buttonBorderRadius ?? defaults.buttonBorderRadius,
    colors: {
      primary: mc.colors?.primary ?? defaults.colors.primary,
      background: mc.colors?.background ?? defaults.colors.background,
      text: mc.colors?.text ?? defaults.colors.text,
      buttonBackground: mc.colors?.buttonBackground ?? defaults.colors.buttonBackground,
      buttonText: mc.colors?.buttonText ?? defaults.colors.buttonText,
    },
  } : defaults;

  const fp = row.facebook_pixel;
  const fpDefaults = getDefaultFacebookPixelConfig();

  const facebookPixel: FacebookPixelConfig = fp ? {
    pixelId: fp.pixelId ?? fpDefaults.pixelId,
    viewContentEvent: fp.viewContentEvent ?? fpDefaults.viewContentEvent,
    leadEvent: fp.leadEvent ?? fpDefaults.leadEvent,
    customEvents: fp.customEvents ?? fpDefaults.customEvents,
  } : fpDefaults;

  return {
    id: row.id,
    slug: row.slug,
    phoneNumber: row.phone_number,
    message: row.message,
    type: row.type,
    clicks: row.clicks,
    tags: row.tags || [],
    createdAt: row.created_at,
    microlandingConfig,
    facebookPixel,
  };
}

function getDefaultMicrolandingConfig(): MicrolandingConfig {
  return {
    showLogo: true,
    showImage: true,
    showHeaderText: true,
    showSubheaderText: true,
    showFooterText: true,
    logoUrl: '',
    imageUrl: '',
    logoSize: 'large',
    logoGlassmorphism: false,
    logoGlassOpacity: 20,
    logoVerticalPosition: 0,
    headerText: 'Activos en este momento',
    subheaderText: 'Reclama tu Bono del 100%',
    title: 'Contáctanos',
    description: 'Escríbenos apretando el botón de abajo',
    descriptionBold: false,
    descriptionUnderline: false,
    footerText: 'Solo para mayores de 18 años',
    footerTextSize: 18,
    buttonText: 'WHATSAPP OFICIAL',
    buttonIcon: 'whatsapp',
    buttonBorderRadius: 25,
    colors: {
      primary: '#4CAF50',
      background: '#0A1628',
      text: '#FFFFFF',
      buttonBackground: '#25D366',
      buttonText: '#FFFFFF',
    },
  };
}

function getDefaultFacebookPixelConfig(): FacebookPixelConfig {
  return {
    pixelId: '',
    viewContentEvent: true,
    leadEvent: true,
    customEvents: [],
  };
}

// =====================================================
// LINKS CRUD OPERATIONS
// =====================================================

export async function getAllLinks(): Promise<LinkData[]> {
  const sql = getSQL();

  const rows = await sql`
    SELECT * FROM links_complete 
    ORDER BY created_at DESC
  `;

  return rows.map((row) => dbToLinkData(row as unknown as DBLinkComplete));
}

export async function getLinkBySlug(slug: string): Promise<LinkData | null> {
  const sql = getSQL();

  const rows = await sql`
    SELECT * FROM links_complete 
    WHERE slug = ${slug}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return null;
  }

  return dbToLinkData(rows[0] as unknown as DBLinkComplete);
}

export async function getLinkById(id: string): Promise<LinkData | null> {
  const sql = getSQL();

  const rows = await sql`
    SELECT * FROM links_complete 
    WHERE id = ${id}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return null;
  }

  return dbToLinkData(rows[0] as unknown as DBLinkComplete);
}

export async function createLink(linkData: LinkData): Promise<{ success: boolean; message: string; id?: string }> {
  const sql = getSQL();

  try {
    // Check if slug already exists
    const existing = await sql`SELECT id FROM links WHERE slug = ${linkData.slug}`;
    if (existing.length > 0) {
      return { success: false, message: 'El slug ya existe' };
    }

    // Insert link
    const linkResult = await sql`
      INSERT INTO links (slug, phone_number, message, type, clicks, tags)
      VALUES (
        ${linkData.slug},
        ${linkData.phoneNumber},
        ${linkData.message},
        ${linkData.type},
        ${linkData.clicks || 0},
        ${linkData.tags || []}
      )
      RETURNING id
    `;

    const linkId = linkResult[0].id;

    // Insert microlanding config
    const mc = linkData.microlandingConfig;
    await sql`
      INSERT INTO microlanding_configs (
        link_id, show_logo, show_image, show_header_text, show_subheader_text, show_footer_text,
        logo_url, image_url, logo_size, logo_glassmorphism, logo_glass_opacity, logo_vertical_position,
        header_text, subheader_text, title, description, description_bold, description_underline,
        footer_text, footer_text_size, button_text, button_icon, button_border_radius,
        color_primary, color_background, color_text, color_button_background, color_button_text
      )
      VALUES (
        ${linkId}, ${mc.showLogo}, ${mc.showImage}, ${mc.showHeaderText}, ${mc.showSubheaderText}, ${mc.showFooterText},
        ${mc.logoUrl}, ${mc.imageUrl}, ${mc.logoSize}, ${mc.logoGlassmorphism}, ${mc.logoGlassOpacity}, ${mc.logoVerticalPosition},
        ${mc.headerText}, ${mc.subheaderText}, ${mc.title}, ${mc.description}, ${mc.descriptionBold}, ${mc.descriptionUnderline},
        ${mc.footerText}, ${mc.footerTextSize}, ${mc.buttonText}, ${mc.buttonIcon}, ${mc.buttonBorderRadius},
        ${mc.colors.primary}, ${mc.colors.background}, ${mc.colors.text}, ${mc.colors.buttonBackground}, ${mc.colors.buttonText}
      )
    `;

    // Insert facebook pixel config
    const fp = linkData.facebookPixel;
    await sql`
      INSERT INTO facebook_pixel_configs (link_id, pixel_id, view_content_event, lead_event, custom_events)
      VALUES (${linkId}, ${fp.pixelId}, ${fp.viewContentEvent}, ${fp.leadEvent}, ${fp.customEvents || []})
    `;

    return { success: true, message: 'Link creado correctamente', id: linkId };
  } catch (error) {
    console.error('Error creating link:', error);
    return { success: false, message: (error as Error).message };
  }
}

export async function updateLink(slug: string, linkData: LinkData): Promise<{ success: boolean; message: string }> {
  const sql = getSQL();

  try {
    // Get link ID
    const linkRows = await sql`SELECT id FROM links WHERE slug = ${slug}`;
    if (linkRows.length === 0) {
      return { success: false, message: 'Link no encontrado' };
    }

    const linkId = linkRows[0].id;

    // Update link
    await sql`
      UPDATE links SET
        phone_number = ${linkData.phoneNumber},
        message = ${linkData.message},
        type = ${linkData.type},
        clicks = ${linkData.clicks},
        tags = ${linkData.tags || []}
      WHERE id = ${linkId}
    `;

    // Update microlanding config
    const mc = linkData.microlandingConfig;
    await sql`
      UPDATE microlanding_configs SET
        show_logo = ${mc.showLogo},
        show_image = ${mc.showImage},
        show_header_text = ${mc.showHeaderText},
        show_subheader_text = ${mc.showSubheaderText},
        show_footer_text = ${mc.showFooterText},
        logo_url = ${mc.logoUrl},
        image_url = ${mc.imageUrl},
        logo_size = ${mc.logoSize},
        logo_glassmorphism = ${mc.logoGlassmorphism},
        logo_glass_opacity = ${mc.logoGlassOpacity},
        logo_vertical_position = ${mc.logoVerticalPosition},
        header_text = ${mc.headerText},
        subheader_text = ${mc.subheaderText},
        title = ${mc.title},
        description = ${mc.description},
        description_bold = ${mc.descriptionBold},
        description_underline = ${mc.descriptionUnderline},
        footer_text = ${mc.footerText},
        footer_text_size = ${mc.footerTextSize},
        button_text = ${mc.buttonText},
        button_icon = ${mc.buttonIcon},
        button_border_radius = ${mc.buttonBorderRadius},
        color_primary = ${mc.colors.primary},
        color_background = ${mc.colors.background},
        color_text = ${mc.colors.text},
        color_button_background = ${mc.colors.buttonBackground},
        color_button_text = ${mc.colors.buttonText}
      WHERE link_id = ${linkId}
    `;

    // Update facebook pixel config
    const fp = linkData.facebookPixel;
    await sql`
      UPDATE facebook_pixel_configs SET
        pixel_id = ${fp.pixelId},
        view_content_event = ${fp.viewContentEvent},
        lead_event = ${fp.leadEvent},
        custom_events = ${fp.customEvents || []}
      WHERE link_id = ${linkId}
    `;

    return { success: true, message: 'Link actualizado correctamente' };
  } catch (error) {
    console.error('Error updating link:', error);
    return { success: false, message: (error as Error).message };
  }
}

export async function deleteLink(slug: string): Promise<{ success: boolean; message: string }> {
  const sql = getSQL();

  try {
    const result = await sql`
      DELETE FROM links WHERE slug = ${slug}
      RETURNING id
    `;

    if (result.length === 0) {
      return { success: false, message: 'Link no encontrado' };
    }

    return { success: true, message: 'Link eliminado correctamente' };
  } catch (error) {
    console.error('Error deleting link:', error);
    return { success: false, message: (error as Error).message };
  }
}

export async function incrementClicks(slug: string, retries = 2): Promise<{ success: boolean; clicks?: number }> {
  const sql = getSQL();

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await sql`
        UPDATE links SET clicks = clicks + 1
        WHERE slug = ${slug}
        RETURNING clicks
      `;

      if (result.length === 0) {
        return { success: false };
      }

      return { success: true, clicks: result[0].clicks as number };
    } catch (error) {
      if (attempt === retries) {
        console.error('Error incrementing clicks after retries:', error);
        return { success: false };
      }
      // Wait a bit before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)));
    }
  }

  return { success: false };
}

// =====================================================
// ADMIN CREDENTIALS
// =====================================================

export async function getAdminCredentials(): Promise<{ username: string; password: string } | null> {
  const sql = getSQL();

  try {
    const rows = await sql`
      SELECT username, password_hash as password FROM admin_credentials
      LIMIT 1
    `;

    if (rows.length === 0) {
      return null;
    }

    return {
      username: rows[0].username as string,
      password: rows[0].password as string,
    };
  } catch (error) {
    console.error('Error getting admin credentials:', error);
    return null;
  }
}

export async function saveAdminCredentials(username: string, passwordHash: string): Promise<{ success: boolean; message: string }> {
  const sql = getSQL();

  try {
    // Upsert - insert or update
    await sql`
      INSERT INTO admin_credentials (username, password_hash)
      VALUES (${username}, ${passwordHash})
      ON CONFLICT (username) DO UPDATE SET
        password_hash = ${passwordHash}
    `;

    return { success: true, message: 'Credenciales guardadas correctamente' };
  } catch (error) {
    console.error('Error saving admin credentials:', error);
    return { success: false, message: (error as Error).message };
  }
}

// =====================================================
// BOT DETECTIONS
// =====================================================

export interface BotDetectionRecord {
  ipAddress: string;
  slug?: string;
  userAgent?: string;
  detectionType: 'recaptcha' | 'webdriver' | 'rate_limit';
  recaptchaScore?: number;
  clientBotScore?: number;
  isWebdriver?: boolean;
  errorMessage?: string;
  requestHeaders?: Record<string, string>;
}

export async function logBotDetection(detection: BotDetectionRecord): Promise<void> {
  const sql = getSQL();

  try {
    await sql`
      INSERT INTO bot_detections (
        ip_address,
        slug,
        user_agent,
        detection_type,
        recaptcha_score,
        client_bot_score,
        is_webdriver,
        error_message,
        request_headers
      ) VALUES (
        ${detection.ipAddress},
        ${detection.slug ?? null},
        ${detection.userAgent ?? null},
        ${detection.detectionType},
        ${detection.recaptchaScore ?? null},
        ${detection.clientBotScore ?? null},
        ${detection.isWebdriver ?? false},
        ${detection.errorMessage ?? null},
        ${detection.requestHeaders ? JSON.stringify(detection.requestHeaders) : null}
      )
    `;
  } catch (error) {
    // Don't throw - logging should not break the main flow
    console.error('Error logging bot detection:', error);
  }
}

export async function getBotDetections(limit: number = 100): Promise<any[]> {
  const sql = getSQL();

  const rows = await sql`
    SELECT * FROM bot_detections
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return rows;
}

export async function getBotDetectionStats(): Promise<{
  total: number;
  byType: Record<string, number>;
  last24h: number;
}> {
  const sql = getSQL();

  const [totalResult] = await sql`SELECT COUNT(*) as count FROM bot_detections`;
  const [last24hResult] = await sql`
    SELECT COUNT(*) as count FROM bot_detections 
    WHERE created_at > NOW() - INTERVAL '24 hours'
  `;
  const byTypeRows = await sql`
    SELECT detection_type, COUNT(*) as count 
    FROM bot_detections 
    GROUP BY detection_type
  `;

  const byType: Record<string, number> = {};
  for (const row of byTypeRows) {
    byType[row.detection_type as string] = Number(row.count);
  }

  return {
    total: Number(totalResult.count),
    byType,
    last24h: Number(last24hResult.count)
  };
}

// =====================================================
// SEARCH
// =====================================================

export async function searchLinks(term: string): Promise<LinkData[]> {
  const sql = getSQL();

  const searchPattern = `%${term}%`;

  const rows = await sql`
    SELECT * FROM links_complete 
    WHERE 
      slug ILIKE ${searchPattern} OR
      phone_number ILIKE ${searchPattern} OR
      message ILIKE ${searchPattern}
    ORDER BY created_at DESC
  `;

  return rows.map((row) => dbToLinkData(row as unknown as DBLinkComplete));
}
