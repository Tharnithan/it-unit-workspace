# IT Unit Workspace

A React/TypeScript frontend and Express backend using **XAMPP MySQL/MariaDB** with ordinary SQL columns, indexes and foreign keys. SQLite is now only an original backup and migration source.

## Start the app

Start **MySQL** in XAMPP. Start **Apache** too to use phpMyAdmin. Then:

```powershell
cd F:\Projects\SLSI
npm run dev
```

Requires Node.js 22.16 or newer. Dependencies are already installed; use `npm install` on a fresh checkout. The backend automatically loads `backend/.env`, including the dedicated database credentials. Keep this file private. Shell environment variables take precedence.

Open http://localhost:5173. The API runs on http://127.0.0.1:4000, reached through the frontend's `/api` proxy. Press Ctrl+C to stop both servers.

Other office computers can use http://192.168.120.120:5173 while this computer retains that address. Firewall rule `SLSI-IT-Workspace-LAN-5173` allows the frontend from the local Ethernet subnet. Staff computers access data through the API, not a direct database connection.

## View your data in phpMyAdmin

Open **http://localhost/phpmyadmin/** on this computer. Select **it_unit_workspace**, choose a table, then **Browse**.

| Table | Contents |
| --- | --- |
| users | Names, designations, roles, login identifiers and password hashes |
| tasks | Assignments, division, progress, status, due dates and resolutions |
| task_updates | Progress notes and who made each update |
| task_events | Assignment and status history |
| conversations and conversation_members | Chat groups and their participants |
| messages | Message text, sender and timestamps |
| meetings and meeting_attendees | Meeting details and attendance responses |
| notifications | User notifications and read status |
| audit_log | Recorded administrative and workflow actions |
| sessions | Login sessions |
| push_subscriptions and push_outbox | Push device registrations and delivery queue |
| workspace_meta | Internal database revision counter |

Names, messages and task fields are separate columns, not JSON documents. Passwords remain salted hashes and cannot be viewed as plain text. Dates are stored in UTC; the website displays Sri Lanka time.

Example queries are in `backend/sql/inspect-data.sql`. Use the website for editing to preserve validation, task history and audit records. phpMyAdmin is useful for browsing, queries and SQL exports.

## Accounts

All existing accounts and password hashes were migrated unchanged. Initial account names are `itunit1` for the SDD, `itunit2` through `itunit11` for employees and `admin` for maintenance. The original demo password was `ITunit-demo-2026!`; changed passwords remain changed.

Administrator password resets are under **Team → member profile → Reset user password**. Resetting signs the user out, removes their push registrations and records an audit event. Each user can change their own password in Settings.

## Database setup and backup

This computer is configured with database `it_unit_workspace`, server `127.0.0.1:3306` and dedicated database user `it_unit_app`. The generated password is in ignored file `backend/.env`. The account has SELECT, INSERT, UPDATE and DELETE permissions on this database only.

On a new installation, `npm run db:setup --workspace backend` creates the schema and migrates `backend/data/workspace.sqlite` if MySQL is empty. It uses `MYSQL_ADMIN_USER` and `MYSQL_ADMIN_PASSWORD` (defaults: standard local XAMPP root with no password). For a fresh database without SQLite, set `INITIAL_PASSWORD` first. Existing MySQL data is retained on repeat setup.

The original SQLite file and `backend/data/pre-mysql-*.json` migration snapshot are retained. **New records are saved only to MySQL.** For future backups use phpMyAdmin → `it_unit_workspace` → **Export** → SQL, including all tables. Keep the exports private and test restoration into a separate database.

## Structure and tests

- `frontend/src/`: screens, types and reusable interface components.
- `backend/src/routes/`: task, chat, meeting, team and notification endpoints.
- `backend/src/database/mysql-store.js`: parameterized queries and transactions.
- `backend/src/database/model.js`: table definitions, indexes and relationships.
- `backend/src/database/records.js`: application object to SQL row mapping.
- `backend/sql/schema.sql`: exported relational schema.
- `backend/scripts/setup-mysql.js`: database setup and data migration.

```powershell
npm test
npm run test:mysql --workspace backend
npm run build
```

The MySQL integration test uses a temporary isolated database and deletes only that test database afterward. It requires local MySQL administrator access and never writes fixtures into the application database.

## Current boundaries

This is a local application, not a cloud deployment. Use one API process for this small workspace. Requests reload committed MySQL data and are serialized; writes use transactions and revision checks. The API waits for a successful commit before returning success. Failed writes roll back. It does not fall back to SQLite if MySQL is unavailable.

Attachments, photos, password reset emails, frozen historical monthly reports and automatic task/meeting reminders are not implemented. Background web push requires VAPID keys, browser permission and HTTPS outside localhost. See `DEPLOYMENT.md` for hosting and push configuration.
