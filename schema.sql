CREATE TABLE IF NOT EXISTS products (
  cj_pid TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  supplier_price REAL NOT NULL,
  retail_price REAL NOT NULL,
  store_category TEXT NOT NULL,
  cj_sku TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
-- Paid orders, written by the Stripe webhook. You fulfil these in CJ, then update the status in /admin.html.
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,            -- Stripe Checkout Session id
  email TEXT,
  customer_name TEXT,
  shipping_json TEXT,             -- name + address from Stripe
  items_json TEXT NOT NULL,       -- [{pid,name,sku,qty,unit_price}]
  total REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid',  -- paid | ordered_with_cj | shipped | refunded
  created_at INTEGER NOT NULL
);
