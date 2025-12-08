# ShortWhats Database

## Overview

This directory contains the database schema and migrations for the ShortWhats application.

## Database Choice: Neon (PostgreSQL)

We use [Neon](https://neon.tech) - a serverless PostgreSQL database that works great with Vercel.

### Why Neon?

- **Serverless** - Scales to zero, no idle costs
- **Connection pooling** - Handles Vercel's serverless connection pattern
- **Branching** - Preview deployments get their own DB branch
- **Free tier** - 0.5 GB storage, 190 compute hours/month

## Setup Instructions

### 1. Create a Neon Account

1. Go to [neon.tech](https://neon.tech)
2. Sign up with GitHub
3. Create a new project (e.g., "shortwhats")

### 2. Get Connection String

1. In Neon dashboard, go to your project
2. Copy the connection string (it looks like):
   ```
   postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```

### 3. Set Environment Variables

Add to your `.env.local` (local development) and Vercel environment variables:

```env
DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
```

### 4. Run Migrations

```bash
# Using psql directly
psql $DATABASE_URL -f database/migrations/001_initial_schema.sql

# Or using the full schema
psql $DATABASE_URL -f database/schema.sql
```

## Schema Overview

### Tables

| Table | Description |
|-------|-------------|
| `links` | Main table with slug, phone, message, type, clicks |
| `microlanding_configs` | Visual configuration for microlanding pages |
| `facebook_pixel_configs` | Facebook Pixel tracking settings |
| `admin_credentials` | Admin login credentials (hashed passwords) |
| `file_uploads` | Tracks uploaded files |
| `schema_migrations` | Tracks applied migrations |

### Relationships

```
links (1) ──── (1) microlanding_configs
      │
      └────── (1) facebook_pixel_configs
```

## Data Migration from JSON

To migrate existing data from the PHP JSON files:

1. Export all links from the current API:
   ```bash
   curl "https://api.diversionconseguridad.com/api.php?api=all&folder=whatsgrow_links" > links_backup.json
   ```

2. Run the migration script (see `scripts/migrate-from-json.ts`)

## Useful Queries

### Get all links with full config
```sql
SELECT * FROM links_complete ORDER BY created_at DESC;
```

### Get link by slug
```sql
SELECT * FROM links_complete WHERE slug = 'my-link';
```

### Increment click count
```sql
UPDATE links SET clicks = clicks + 1 WHERE slug = 'my-link';
```

### Get links with most clicks
```sql
SELECT slug, clicks FROM links ORDER BY clicks DESC LIMIT 10;
```
