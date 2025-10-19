-- Initialize database
-- This runs automatically on first PostgreSQL container start

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE stories_collector TO stories_user;

-- Create initial schema (optional, Prisma migrations will handle this)
-- But useful for debugging
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'stories_user') THEN
    CREATE ROLE stories_user WITH LOGIN PASSWORD 'stories_pass';
  END IF;
END
$$;