-- Runs once when the Postgres volume is first created.
-- Medusa uses the public schema; Prisma (CMS) uses the cms schema in the same DB.
CREATE SCHEMA IF NOT EXISTS cms;
