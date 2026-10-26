# Deployment and configuration

The application now uses **Express and MySQL/MariaDB**. XAMPP's MariaDB server is compatible with the MySQL driver and schema. Microsoft SQL Server and Supabase are not connected.

## Local setup

Database `it_unit_workspace` is configured on `127.0.0.1:3306`. The backend automatically loads `backend/.env`. Start MySQL in XAMPP, then `npm run dev`. Start Apache to view http://localhost/phpmyadmin/.

The generated `it_unit_app` database login is limited to this database. Its private password is in `backend/.env`. MySQL credentials are separate from website accounts such as `itunit1`.

Use `npm run db:setup --workspace backend` to initialize a new installation. Setup imports SQLite only when MySQL contains no users and preserves existing MySQL data on repeat runs. `backend/sql/schema.sql` provides table definitions for manual provisioning. Do not point setup at another application's database.

## Online deployment

1. Store source in a private GitHub repository, excluding environment files, database files and exports.
2. Provision a durable hosted MySQL/MariaDB database. Aiven's free MySQL tier advertises 1 GB storage; import a phpMyAdmin SQL export and create a restricted app login. Add TLS using the provider's CA. XAMPP is local and cannot be reached by a cloud server.
3. In Render, create a Web Service from the GitHub repository using `render.yaml`, or set root directory `backend`, build `npm install`, start `npm start`, and health path `/api/health`. Set MySQL and VAPID variables privately. Free services sleep after 15 minutes; their local filesystem is ephemeral, while this app stores data in MySQL.
4. In Cloudflare Pages, connect the repository with root directory `frontend`, build `npm run build`, output `dist`, and set `VITE_API_URL` to the Render backend URL. Add the exact Pages URL to Render's `CORS_ORIGINS`.
5. Serve HTTPS, replace demonstration passwords, prepare secure sessions and account recovery, and test permissions and backups before external use.
6. Run a single API process with this repository implementation. Its request queue and database revision check are designed for a small workspace, not distributed deployment.

GitHub Pages can host static frontend files only. Supabase is an alternative requiring a separate PostgreSQL/authentication migration. No cloud service has been deployed yet.

## Web push

Run `npm run push:keys --workspace backend`. Add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and a real `mailto:` contact in `VAPID_SUBJECT` to `backend/.env`, then restart. **The file is now loaded automatically.** Keep private keys secret and reuse the same keys across restarts.

In Settings select Enable push notifications. localhost supports development testing; a LAN IP needs HTTPS. Browser subscriptions and the retry queue are saved in MySQL. Automatic due-date and meeting reminders remain unimplemented.

## Backups

## Office email verification (Render + Vercel)

The app supports one-time ownership verification of the saved `@slsi.lk` mailbox. It is not an email password reset or a code on every login. Codes expire after ten minutes, allow five attempts, and have a one-minute resend cooldown and five-send hourly limit. Only salted code hashes are stored. Changing the office address clears verification and revokes that employee's sessions. Employees cannot choose a different recipient at the verification screen.

### Upgrade before deploying this version

From `F:\Projects\SLSI`, with the existing private `backend/.env.aiven` and CA certificate, run:

```powershell
node backend/scripts/upgrade-email-schema.js --aiven
```

This adds a nullable column to the existing cloud users table, without replacing users or other records. It is safe to rerun. Do not rerun the original data-copy migration. For a local database, run the same command without `--aiven` using a MySQL account with ALTER permission; the restricted local app account may not have that permission. New databases created from schema.sql already include the column.

### Configure delivery

Create a Resend account and verify a sender domain you are authorized to manage, following https://resend.com/docs/dashboard/domains/introduction. Sending from `slsi.lk` requires your domain administrator to add its DNS records. The sender may use another verified domain you control; recipients remain restricted to `@slsi.lk`. The default testing sender is not suitable for delivery to all employees. No office mailbox password is required by this implementation.

Set these in Render's backend Environment, never in Vercel or Git:

```text
RESEND_API_KEY=<your private sending API key>
EMAIL_FROM=IT Unit <verification@your-verified-domain>
EMAIL_VERIFICATION_REQUIRED=false
```

Push the code and redeploy Render and Vercel. In Team, the administrator or SDD must enter each employee's actual, unique office email. In Settings, test Send verification code and Verify email with a real mailbox. Successful API acceptance alone does not prove inbox delivery; check the inbox/spam folder and provider delivery logs.

After the delivery test succeeds and all employee addresses are correct, set `EMAIL_VERIFICATION_REQUIRED=true` in Render and redeploy. Unverified SDD and employee accounts then see a verification screen and cannot access workspace APIs, including through existing sessions. Administrators remain able to access the workspace to repair email configuration and staff addresses; they can verify their own mailbox in Settings. Keep administrator credentials secure. This exception is intentional for recovery.

The mail API currently runs within the app's serialized request queue and has a ten-second timeout; a slow provider can briefly delay other requests. Actual provider delivery must be verified after configuration.

Export all tables of `it_unit_workspace` as SQL in phpMyAdmin. Exports include private chat, account hashes and session records, so store them securely. Test restores in a separate database. The old SQLite file is a migration backup and receives no new writes.

## Ended tasks and page navigation

The sidebar Ended Tasks section reads `GET /api/tasks/ended` with optional `search`, `month` (YYYY-MM in Asia/Colombo), `offset`, and `limit` (1–100). Only non-deleted Completed tasks are returned. SDD/admin see all authorized completed work; employees see their assignments. Reopening a task returns it to active work without removing its update history. This endpoint uses existing task columns and needs no additional schema migration. Deploy the backend route before the frontend that calls it. The earlier email-verification schema upgrade remains separately required if those pending changes are included.

Back navigates through sections visited during this signed-in session; it is disabled when there is no previous section. Dialog Back returns to its parent view. Browser history and cross-refresh navigation are not changed.

## New assignment alerts

Tasks created by the SDD or administrator generate an unread notification for the assignee. New assignment notifications use the stable `assignment:<task UUID>` identifier in the existing notification ID column, allowing the workspace response to include an authorized task link without a schema change or title matching. Older notifications without that identifier remain in the notification inbox. The Overview alert appears only for unread assignments still owned by the current user, excluding completed and removed tasks. View task and Dismiss alert mark the notification read in the database; neither completes the task. The existing five-second workspace poll updates alerts while signed in; offline users see unread alerts after login. Browser push remains a separate opt-in delivery channel. Deploy frontend and backend together for new assignment links.

## Office workspace expansion (19 October 2026)

Before deploying this version, run the additive workspace schema upgrade and follow OFFICE-ROLLOUT.md. The new backend intentionally refuses to start against a database missing workspace_items. Email recovery, reminders, recurring work and backups require the configuration and operational checks documented there.

### Reverse proxy and rate limiting

The backend trusts one proxy hop when Render sets RENDER=true. Direct local hosting trusts zero hops. TRUST_PROXY_HOPS can explicitly override this with an integer from 0 to 5. Keep the hop count aligned with the actual proxy chain; do not increase it merely to silence a warning, and do not expose the app directly when configured to trust forwarded headers. This setting is applied before all rate limiters. Verify the client IP in your hosting topology if additional proxies are introduced.

