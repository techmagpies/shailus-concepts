# Admin order dashboard setup

The dashboard page is public static content, but it contains no order data. Every order read and order-status update is served by a Netlify Function that requires an authenticated, currently authorized owner or staff account.

## Render migration (staging only until cutover approval)

The Render service reuses the seven existing Netlify Function handlers through `render-server.js`. The Render PostgreSQL adapter implements the store operations used by those handlers; the Netlify Blobs default remains in place for Netlify. `render.yaml` declares a continuously available web service and a persistent PostgreSQL plan. Do not select an expiring/free database for production order records.

Render's web-service build command is `npm ci`; its start command is `npm start`; the health-check path is `/healthz`. `DATABASE_URL` is linked from the Render database in the Blueprint. At startup, the service applies the additive `CREATE ... IF NOT EXISTS` schema migration before accepting traffic; it does not drop or truncate data. `npm run db:migrate` is also available for an explicit manual schema setup. The Blueprint contains proposed service/database plan identifiers; confirm current availability, region, cost, disk/backup/retention behavior, and suitability for production in the Render dashboard before applying it.

Set these server-only values in Render's environment settings:

- `ADMIN_SESSION_SECRET`, `ADMIN_USERS_JSON`
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- `CHECKOUT_ALLOWED_ORIGINS`: comma-separated exact HTTPS origins for the Hostinger staging and production sites; never use `*`.
- `DATABASE_URL`: use the private connection string supplied by the linked Render PostgreSQL service. Do not copy it into frontend code or Git.

Render provides `PORT`. The app uses Node.js 22.12.0. `ADMIN_USERS_JSON` continues to contain salted scrypt hashes, never plaintext passwords. Admin sessions remain host-only, `Path=/`, `HttpOnly`, `Secure`, and `SameSite=Strict`; there is no `ADMIN_COOKIE_SAMESITE` override. Do not place any secret in `api-config.js`; its base URL is public.

For admin sessions, use a custom API hostname under the same registrable domain as the Hostinger site (for example, `api.<your-domain>`), not the Render `*.onrender.com` hostname. A sibling API subdomain is cross-origin but same-site; the browser can send the host-only API cookie on credentialed requests without relying on third-party cookies. Once Render provides the service hostname and the domain is selected, add `api.<your-domain>` as a Render custom domain, use the exact CNAME target shown by Render in GoDaddy, and wait for Render TLS provisioning. These DNS steps are not performed by this project. Configure the exact Hostinger site origins in `CHECKOUT_ALLOWED_ORIGINS`; configure the actual API HTTPS origin in `api-config.js` on the Hostinger staging copy. Before uploading that copy, add the actual API origin to the `connect-src` directive in `admin/orders.html`. Do not cut over until a real-browser test confirms login, session persistence, order retrieval, status update, and logout on the intended domain pair.

### Securely export/import the current Blobs data

The export contains customer addresses, order details, payment references, login rate-limit state, and revoked-session state. It is encrypted with AES-256-GCM and written only to a new path outside the repository; the exporter refuses to overwrite an existing file. Keep the encrypted snapshot and passphrase private; do not delete it or the Netlify source data as part of this migration. Neither command has been run as part of code preparation.

In a private PowerShell session, create a local-only directory, enter the Netlify site ID, and prompt for the personal access token and migration passphrase without putting either secret in command history:

```powershell
if (-not (Test-Path "$env:LOCALAPPDATA\ShailusPrivateMigration")) {
  New-Item -ItemType Directory -Path "$env:LOCALAPPDATA\ShailusPrivateMigration" | Out-Null
}
$env:NETLIFY_SITE_ID = Read-Host "Netlify site ID"
$env:NETLIFY_AUTH_TOKEN = [System.Net.NetworkCredential]::new('', (Read-Host "Netlify personal access token" -AsSecureString)).Password
$env:MIGRATION_PASSPHRASE = [System.Net.NetworkCredential]::new('', (Read-Host "Migration passphrase (16+ characters)" -AsSecureString)).Password
npm run db:export-netlify -- "$env:LOCALAPPDATA\ShailusPrivateMigration\orders-snapshot.enc.json"
```

After the Render PostgreSQL database exists and the schema migration has completed, enter its connection string at the secure prompt and import the snapshot:

```powershell
$env:DATABASE_URL = [System.Net.NetworkCredential]::new('', (Read-Host "Render PostgreSQL external connection string" -AsSecureString)).Password
$env:MIGRATION_PASSPHRASE = [System.Net.NetworkCredential]::new('', (Read-Host "Migration passphrase" -AsSecureString)).Password
npm run db:import-netlify -- "$env:LOCALAPPDATA\ShailusPrivateMigration\orders-snapshot.enc.json"
```

The local import command needs Render's external PostgreSQL connection string. Keep the database IP allow-list closed by default; temporarily allow only the importing workstation's current public IP, use the TLS connection string from Render, and remove that IP rule immediately after import. If this restricted access cannot be arranged, do not broaden the allow-list; use a separately approved import method. The importer validates keys and order references and runs in one serializable transaction. It inserts missing records, accepts already-present records only when their JSON values exactly match, and aborts on conflicting or unrelated destination records. It verifies the final record count before commit and prints total records, order count, inserted count, and matching-existing count without printing customer data. Re-running the same import is a read/verification pass with zero inserts; it never replaces or deletes a record. The Netlify source remains unchanged. Compare the export count and order count with the Render import report, then verify expected order IDs/statuses through the authenticated admin page before any traffic switch. Keep the private snapshot under the user's data-retention policy.

### Render API and Hostinger static frontend

Render routes are `GET/POST /api/admin/auth`, `GET /api/admin/orders`, `POST /api/admin/orders/status`, `POST /api/payments/orders`, `POST /api/payments/verify`, `POST /api/payments/status`, and `POST /api/webhooks/razorpay`. The existing payment handlers still validate server-side prices, signatures, and Razorpay state.

`api-config.js` defaults to the current `/.netlify/functions/` routes so the existing Netlify deployment can continue to serve its current behavior. For a separate Hostinger staging copy, set `window.SHAILUS_API_BASE_URL` to the actual HTTPS API custom-domain origin after the Render service and domain are provisioned; no Render URL is preconfigured. The staged service name in `render.yaml` is `shailus-concepts-api-staging`. CORS validates exact allowed origins. The admin page CSP must include the actual API origin in `connect-src`; do not broaden it to arbitrary HTTPS hosts. The Razorpay webhook should only be changed to the Render URL after it is deployed and verified; keep the Netlify webhook active during staging.

Use the imported database and Razorpay test-mode credentials only for staging. Once staging passes, a production cutover will require a separately created production Postgres database, a new encrypted final export from the still-live Netlify store, and a fresh import into that empty production database. This avoids copying staging/test orders into production and captures orders created on Netlify during staging. Keep the staging snapshot and records under the user's retention policy; do not delete them without separate approval.

The Hostinger `public_html` upload consists of these root files:

- HTML: `index.html`, `gallery.html`, `views.html`, `checkout.html`, `contact.html`, `customized-order.html`, `login.html`, `navbar.html`.
- CSS: `style.css`, `responsive.css`, `gallery.css`, `customized.css`, `shared-navbar.css`, `shared-footer.css`.
- Browser JavaScript: `api-config.js`, `main.js`, `cart-store.js`, `products-data.js`, `gallery.js`, `contact.js`, `customized.js`, `shared-navbar.js`, `shared-footer.js`.
- Catalog and static content: `giftcard.products.json`, the complete `assets/` directory, and `admin/orders.html`, `admin/orders.css`, `admin/orders.js`.

Keep the directory structure and exact filename capitalization. Upload any other existing static file only if a page references it. Do not upload `.git`, `.vscode/`, `node_modules/`, `netlify/`, `scripts/`, `migrations/`, `render-server.js`, `package.json`, `package-lock.json`, `render.yaml`, tests, private snapshots, database files, or server secrets. Include `api-config.js` with the actual staging API origin and the matching admin CSP origin set; do not upload a Hostinger version with an empty/incorrect API URL and assume payment/admin APIs work. Verify category/search/detail/cart and WhatsApp behavior, then test Razorpay test-mode order creation/signature verification/status reconciliation/webhook and admin login/list/status update on the staged Hostinger site. These code changes do not perform a deployment, data import, webhook update, or DNS cutover.

## Netlify Blobs

`@netlify/blobs` stores order snapshots in the site-wide `shailus-concepts-orders` store. Site-wide blobs persist across deploys; deployed Functions receive site-scoped Blobs access from Netlify.
The project uses Node.js 22.12.0 or newer because `@netlify/blobs` 11.1.4 requires that runtime.
The order snapshot is written by `create-order` before the customer enters Razorpay Checkout. The checkout requires an email address and separately collects a phone number; the admin-only listing returns those saved customer, delivery, product, price, and status fields. `paymentStatus` becomes `captured` only after server-side Razorpay verification; the verified payment ID and payment method are saved from Razorpay's authenticated payment response.

Local `netlify dev` in an unlinked project has no Blobs site context, so storage-backed sign-in and order requests return unavailable. After creating a Netlify site, link the project with `netlify link` to exercise Blobs locally. A linked development session accesses that Netlify site's store; use a separate test site for local test orders and never point simulated or synthetic payments at a store containing real customer records. Automated tests use an in-memory conditional-write adapter and do not claim to exercise Netlify's hosted storage service. Do not publish `.netlify` state or copy order data into the repository.

## Required environment variables

- `ADMIN_SESSION_SECRET`: at least 32 random bytes, used to sign sessions and anonymize login-rate-limit keys. Generate one with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`. Keep the same value across deploys; changing it signs out all users.
- `ADMIN_USERS_JSON`: a JSON array of explicitly authorized users. Each object has `email`, `role` (`owner` or `staff`), `salt`, and `passwordHash`. This variable contains salted password hashes, never plaintext passwords.
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`: the existing server-side payment credentials, used to reconcile payment status.
- `RAZORPAY_WEBHOOK_SECRET`: a separate secret you create when registering the payment webhook in the Razorpay Dashboard. It is used only by the webhook function and is not the API Key Secret.
- `CHECKOUT_ALLOWED_ORIGINS`: comma-separated exact origins for the production site and any connected custom domain. Keep `http://localhost:8888` for local Netlify development. Do not include paths or a wildcard.

Set these in Netlify's site environment-variable settings for every context that needs the dashboard. Redeploy after changes.

## Add the first owner or another staff member

1. From a private local terminal, run `npm run admin:hash-password`. The script prompts for an email, role, and a password of at least 12 characters; password entry is hidden. It prints one JSON user record with a unique salt and scrypt hash, not the password.
2. In Netlify, set `ADMIN_USERS_JSON` to a JSON array containing that record. For example, paste the printed record between `[` and `]`. Ensure at least one entry has the `owner` role.
3. Redeploy, then open `/admin/orders.html` on the deployed HTTPS site and sign in.

To add staff, generate another record with role `staff`, append it to the environment variable's JSON array, and redeploy. To revoke access, remove the user's record and redeploy; requests immediately stop authorizing after the new deployment is active. Changing a password hash or role also invalidates existing sessions. Sessions expire after eight hours; sign-out revokes the current session.

## Payment status synchronization

In the Razorpay Dashboard, register a webhook at `https://<your-site-origin>/.netlify/functions/razorpay-webhook`, set a new webhook signing secret, and enable `payment.authorized`, `payment.captured`, and `payment.failed`. Store that same webhook secret in Netlify as `RAZORPAY_WEBHOOK_SECRET`, then redeploy. The function verifies Razorpay's signature and independently reconciles the event against the saved order and Razorpay's authenticated API before changing payment status. Keep the checkout verification function enabled; the webhook is a server-to-server retry/reconciliation path, not a substitute for checkout verification.

Do not put `ADMIN_USERS_JSON`, `ADMIN_SESSION_SECRET`, Razorpay secrets, passwords, or customer order records in frontend files or Git. The dashboard APIs do not allow clients to set payment status or supply trusted prices. Order-status transitions are server-validated; changing an order to cancelled does not issue a refund.
