# Admin order dashboard setup

The dashboard page is public static content, but it contains no order data. Every order read and order-status update is served by a Netlify Function that requires an authenticated, currently authorized owner or staff account.

## Netlify Blobs

`@netlify/blobs` stores order snapshots in the site-wide `shailus-concepts-orders` store. Site-wide blobs persist across deploys; deployed Functions receive site-scoped Blobs access from Netlify.
The project uses Node.js 22.12.0 or newer because `@netlify/blobs` 11.1.4 requires that runtime.

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
