# Environment Variables Setup

## Required Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"

# Vercel Blob Storage (for file uploads)
BLOB_READ_WRITE_TOKEN="vercel_blob_xxx"
```

## How to Get These Values

### 1. DATABASE_URL (Neon)

1. Go to [neon.tech](https://neon.tech) and sign up/login
2. Create a new project (e.g., "shortwhats")
3. In the dashboard, click on your project
4. Copy the connection string from the "Connection Details" section
5. Make sure to select "Pooled connection" for serverless compatibility

### 2. BLOB_READ_WRITE_TOKEN (Vercel Blob)

1. Go to your Vercel dashboard
2. Navigate to Storage → Create Database → Blob
3. Create a new Blob store
4. Copy the `BLOB_READ_WRITE_TOKEN` from the environment variables section

## Vercel Deployment

When deploying to Vercel:

1. Go to your project settings
2. Navigate to Environment Variables
3. Add both variables above
4. Redeploy

## Local Development

For local development, create `.env.local` in the project root:

```bash
# Copy this template
cp ENV_SETUP.md .env.local
# Then edit .env.local with your actual values
```

## Database Migration

After setting up the database, run the initial migration:

```bash
# Using psql
psql $DATABASE_URL -f database/migrations/001_initial_schema.sql

# Or using the full schema
psql $DATABASE_URL -f database/schema.sql
```

## Switching from PHP to API Routes

Once the database is set up and migrated:

1. Rename `src/lib/api.ts` to `src/lib/api-old.ts`
2. Rename `src/lib/api-new.ts` to `src/lib/api.ts`
3. Test the application locally
4. Deploy to Vercel
