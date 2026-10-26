# Office workspace rollout

This release adds the items in `To impliment notes.md`. Code is local until you commit, push and deploy it. Do not assume the hosted database already has the new schema.

## Upgrade order

1. Back up the current MySQL database using your provider's backup/export feature.
2. Configure backend database environment variables for the intended database. Do not use a PostgreSQL connection for this MySQL app.
3. Run `node backend/scripts/upgrade-workspace-schema.js` from the repository root, using the target database's credentials. It adds `workspace_items` and the email verification column if missing. It does not delete existing records. The database user needs CREATE/ALTER privileges for this one-time operation. Use the normal limited application account afterward.
4. Deploy the backend and check `/api/health`.
5. Deploy the frontend with `VITE_API_URL` set to the backend origin. Set backend `CORS_ORIGINS` to the exact production frontend origin.
6. Test with an employee, SDD and Admin account. Use the checks below before broader use.

The upgrade script reads `backend/.env` or environment variables supplied by the host. It does not automatically use `.env.aiven`. Explicitly configure the intended host, database and TLS CA before running it.

## What staff can use

- **Office tools / Service requests:** signed-in staff submit requests for their division. Requesters see their own requests; management sees all. To onboard another division, SDD/Admin create individual employee accounts and record official addresses. There is no anonymous public request form.
- **Tasks:** employees submit completion notes for review. SDD/Admin approve or request changes using Collaboration and review. Pending submissions remain active and do not enter completion reports. Existing completed records are preserved. Management can complete work directly.
- **Equipment:** management register assets, assign staff and record repair/change notes. Employees see their assigned equipment. Management can link equipment to task details.
- **Knowledge base:** SDD/Admin save drafts and publish approved guides. Staff see published content. Each edit creates a retained revision record.
- **Recurring work:** management create daily, weekly or monthly task schedules. Availability is self-reported under Preferences. Workload reports show current active/overdue task counts.
- **Reports:** existing monthly task reports remain. Office tools adds current unresolved requests, category counts, average elapsed completion hours and a workload CSV. These are operational summaries, not SLA compliance measurements.
- **Chat:** per-conversation unread counts, replies, search by keyword/person/date, mentions, reactions, management pins, task conversations, attachments and announcements. Search returns at most the latest 100 matches in the selected conversation. Admin moderation still includes private messages and records an audit entry.
- **Announcements:** SDD/Admin create the channel and publish notices. Staff explicitly acknowledge notices. Reading a message never automatically acknowledges it.

## Files and retention

Files are stored in the database, so restarting the backend does not lose them. Authenticated downloads recheck access. Limits are 2 MB per file, 20 files per request/task/conversation and 100 MB of attachments per workspace. Allowed formats: PDF, PNG, JPEG, TXT and CSV. Office documents can be exported as PDF before upload.

Files download as attachments and are not rendered as HTML. Basic signatures are checked for images and PDF; no malware-scanning service is integrated. Deploy an approved scanning service before permitting untrusted external uploads. There is no anonymous upload endpoint.

Attachments remain until the uploader or authorized management removes them. Account/task soft deletion does not purge related records. Set an institutional retention policy before broad use. Knowledge revisions and audit entries remain stored. Larger offices should move binary storage to an authenticated object store rather than increasing these limits blindly.

## Office email and password recovery

Set backend `RESEND_API_KEY` and `EMAIL_FROM` for your verified sender. Verification and password recovery use the same mail provider. Set each account's unique official `@slsi.lk` address, verify delivery, then enable `EMAIL_VERIFICATION_REQUIRED=true` if required. Admin remains exempt from the verification gate for account support.

Forgot password works only for an active account with a unique, verified email. Codes expire after ten minutes, have five attempts, are stored hashed and can be used only once. Successful recovery revokes existing sessions and push subscriptions. If mail is not configured, use the Admin password reset workflow. Do not enter provider credentials in frontend environment variables.

## Reminders, schedules and quiet hours

The backend checks maintenance every minute while running. Due-tomorrow, due-today and overdue reminders are generated once per task/due-date/day. Overdue reminders also reach SDD/Admin. Pending approval tasks do not generate deadline reminders. Recurring schedules create one catch-up task after downtime and advance to the next future date. Month-end dates clamp to the last valid day of the next month.

Mute and quiet hours affect browser push only; the in-app inbox remains available. Quiet hours use Asia/Colombo, can cross midnight and delay all push, including mentions and announcements. Muted conversations suppress their push. Empty or equal quiet-hour times disable quiet hours. Browser push still needs VAPID keys, HTTPS and permission on the device.

A sleeping free web service cannot run jobs while asleep. For reliable scheduling, use an always-running backend or configure a hosting scheduler to run `npm run maintenance --workspace backend` at least daily, ideally every minute. Do not run two scheduler processes at the same instant; the database revision check prevents conflicting saves, and failed runs should retry. This repository does not create a paid hosting scheduler automatically.

## Automatic encrypted backups

Set `BACKUP_DIR` to durable storage outside the public web directory and `BACKUP_KEY` to a securely generated 32-byte key encoded as 64 hexadecimal characters. Generate a key locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`, store it in your secret manager, and keep a protected recovery copy. Never commit or paste it into chat.

With both values configured, maintenance writes a daily AES-256-GCM encrypted backup. Each file is decrypted immediately after writing to verify integrity. Use `npm run backup --workspace backend` for an on-demand backup. Copy encrypted backup files to a separate protected location. Free ephemeral server storage is not a backup destination. Backups include password hashes and office data, so keep both files and key restricted. Sessions, push subscriptions and recovery codes are excluded. Files are retained until an operator removes them according to office policy; monitor storage.

Test restoration into a **new local file**:

```powershell
node backend/scripts/restore-backup.js "D:\ProtectedBackups\workspace-example.backup" "F:\Projects\SLSI\backend\data\restore-test.sqlite"
```

The script decrypts, restores and reopens a new SQLite database, refuses to overwrite an existing path and leaves production unchanged. It verifies the application records can be recovered. Restoring production MySQL is a separate controlled operation: use the provider restore procedure or validate a migration from the restored data into a new staging database before switching production. Protect and remove temporary restore files after testing.

## Acceptance checks

- Employee submits a service request; another employee cannot see it.
- SDD assigns it; employee submits a resolution; only management approves it.
- Request becomes Resolved and appears in completion reports only after completion.
- Private chat search, replies, task channels and attachment downloads reject unauthorized users.
- Marking chat read clears unread counts but does not acknowledge announcements.
- Quiet hours/muting preserve in-app notices and change push delivery as documented.
- Restart the database-backed app and verify requests, files, chat metadata and schedules remain.
- Verify real email delivery and browser push on intended office devices.
- Confirm scheduled jobs run while the service is otherwise idle.
- Create an encrypted backup, restore to a fresh test file and retain an off-host copy.

Local automated checks cover the API workflows, authorization, record serialization, SQLite persistence, scheduler deduplication, recovery and encrypted backup restoration. Live mail, cloud migration, provider scheduling, off-host backup storage and hosted browser push need deployment configuration and acceptance checks.

## Meeting agenda and summary (26 October 2026)

Open Meetings > Agenda & summary on any meeting card, including past or cancelled meetings. SDD/Admin use Edit summary to save discussion notes, decisions and action items (including owners and due dates). Edit the agenda through Edit meeting. Invited participants can view the saved record; unrelated employees cannot. Revision checks prevent overwriting another editor's newer notes. Participants receive an update notification.

Print / Save PDF opens the browser print dialog; choose Save as PDF. The export uses freshly fetched saved data, including meeting details, invitation responses, agenda, summary, decisions, actions and revision information. It supports multi-page text and does not treat invitation responses as actual attendance.

Records use the existing workspace_items table and are included in normal database persistence and backups. No additional schema migration is needed if the office workspace upgrade has already run. Deploy both frontend and backend together.
