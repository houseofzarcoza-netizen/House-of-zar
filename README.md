# House of Zar — starter store

A mobile-first House of Zar storefront with a Cloudflare Pages Functions backend designed to search and import real CJdropshipping products. No sample products are seeded or displayed.

## Status

Working: storefront, saved shopping bag, CJ catalogue search/import (admin), **Stripe Checkout** (prices re-checked on the server), a **Stripe webhook** that records paid orders, and an **Orders** panel in `/admin.html`.

Still manual, on purpose: **you place each paid order with CJ yourself** (the admin Orders panel shows the customer, address and CJ SKUs), then mark it "Ordered with CJ" / "Shipped". Automatic CJ ordering, live freight quotes, variant/stock checks, refunds and customer tracking emails are not built. Shipping is a flat fee (`SHIPPING_USD`, default 7.99), so check it covers CJ freight for your destinations before launching.

## Stack and cost

- Cloudflare Pages static assets + Pages Functions (Workers Free currently lists 100,000 requests/day; limits can change).
- Cloudflare D1 database (free quota applies; check current Cloudflare pricing/limits).
- A custom domain is optional; the `pages.dev` address can be used initially.
- Payment processing and CJ supplier purchases are not free; payment processors charge fees and supplier products/shipping must be paid for.

## Deploy from a phone

1. Create a GitHub account and a new repository named `house-of-zar`.
2. Upload the contents of this folder to the repository (not the folder wrapper).
3. In Cloudflare Dashboard, open Workers & Pages → Create → Pages → Connect to Git and select the repository.
4. Framework preset: None. Build command: leave blank. Build output directory: `public`.
5. Create a D1 database named `house-of-zar-db` in Cloudflare Dashboard → Workers & Pages → D1. Copy its database ID into `wrangler.toml`.
6. Run the SQL in `schema.sql` in the D1 Console (it now also creates the `orders` table; safe to re-run).
7. In the Pages project Settings → Functions → D1 database bindings, add binding name `DB` and select `house-of-zar-db`.
8. In Pages project Settings → Variables and Secrets, add secrets `CJ_API_KEY` and `ADMIN_SECRET`. `CJ_API_KEY` is the key from your CJ account. `ADMIN_SECRET` should be a long random password you create. Never put either value in GitHub or frontend code.
9. Payments: in Stripe, copy your **secret key** into a Pages secret `STRIPE_SECRET_KEY` (start with a `sk_test_` key). Then in Stripe → Developers → Webhooks add endpoint `https://YOUR-SITE.pages.dev/api/stripe-webhook` for event `checkout.session.completed`, and put its signing secret in a Pages secret `STRIPE_WEBHOOK_SECRET`. Optional variable `SHIPPING_USD` sets the flat shipping fee.
10. Redeploy the project, then test a full purchase with Stripe test card `4242 4242 4242 4242` and confirm the order shows in `/admin.html`. Only switch to live keys after that.

## Admin catalogue import

A small admin interface is not included in this first starter; use the API endpoints with an API client for now:

- `GET /api/health` — basic health check.
- `GET /api/products` — public imported catalogue.
- `GET /api/cj-search?q=blender` with header `x-admin-secret: YOUR_ADMIN_SECRET` — searches CJ's real catalogue.
- `POST /api/cj-import` with header `x-admin-secret: YOUR_ADMIN_SECRET` and JSON body `{ "id":"CJ_PRODUCT_ID", "name":"...", "image":"https://...", "sku":"...", "supplierPrice":12.34, "category":"Kitchen appliance", "markupPercent":45 }` — imports a result returned by CJ search. The server computes a retail price in USD.

Only import products returned by the authenticated CJ search endpoint. Do not accept products from other suppliers.

## CJ API notes

Uses CJ API 2.0 token endpoint and `/product/listV2`. Product search fields and response shape follow CJ's current API docs. Before publishing products for sale, implement and test product detail, variants, destination-specific inventory, and freight calculation.

## Before going live

Test the whole path in Stripe test mode, import only products whose CJ stock and freight you have checked, and add shipping, returns and privacy policies (Stripe and customers expect them). Keep `/admin.html` private.

## Visual supplier admin

After deployment, open `/admin.html` on your store, enter the `ADMIN_SECRET`, search for kitchen products (for example `cutlery`, `cookware`, `blender`, `kettle`), and press **Import this CJ product**. The admin page sends the secret only as a request header; it does not save it in local storage. Keep `/admin.html` private and do not share your admin secret.
