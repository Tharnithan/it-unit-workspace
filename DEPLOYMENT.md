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

Export all tables of `it_unit_workspace` as SQL in phpMyAdmin. Exports include private chat, account hashes and session records, so store them securely. Test restores in a separate database. The old SQLite file is a migration backup and receives no new writes.
