import { query } from './db.js';

const initSql = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  industry varchar(160),
  website varchar(255),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  first_name varchar(120) NOT NULL,
  last_name varchar(120) NOT NULL,
  email varchar(255),
  phone varchar(80),
  title varchar(160),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  stage varchar(40) NOT NULL DEFAULT 'prospecting',
  close_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deals_stage_check CHECK (stage IN ('prospecting', 'qualified', 'proposal', 'won', 'lost'))
);

CREATE INDEX IF NOT EXISTS idx_customers_search ON customers USING gin (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(industry, '') || ' ' || coalesce(notes, '')));
CREATE INDEX IF NOT EXISTS idx_contacts_customer_id ON contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_deals_customer_id ON deals(customer_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_customers_updated_at ON customers;
CREATE TRIGGER set_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_contacts_updated_at ON contacts;
CREATE TRIGGER set_contacts_updated_at
BEFORE UPDATE ON contacts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_deals_updated_at ON deals;
CREATE TRIGGER set_deals_updated_at
BEFORE UPDATE ON deals
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
`;

const sleep = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs));

export async function runMigrationsWithRetry(operation, options = {}) {
  const attempts = options.attempts ?? Number(process.env.MIGRATION_ATTEMPTS || 30);
  const delayMs = options.delayMs ?? Number(process.env.MIGRATION_RETRY_DELAY_MS || 5000);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await operation();
      return;
    } catch (error) {
      if (attempt === attempts) {
        throw error;
      }
      console.warn(`Database migration attempt ${attempt}/${attempts} failed: ${error.message}`);
      await sleep(delayMs);
    }
  }
}

export async function runMigrationsIfEnabled() {
  if (process.env.RUN_MIGRATIONS !== 'true') {
    return;
  }
  await runMigrationsWithRetry(() => query(initSql));
  console.log('Database migrations applied');
}
