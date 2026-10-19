# To impliment notes

SLSI IT Division Workspace

Created: 15 October 2026

## How to use this note

Keep proposed improvements and confirmed work here. The ideas below are recorded for planning; listing an idea does not authorize implementation. When the project owner confirms a future improvement, add it to the confirmed section with the confirmation date and agreed scope. Update its status as work progresses.

Status options: Proposed, Confirmed, In progress, Implemented, Verified, Deferred.

## Confirmed upcoming improvements

All listed improvements were confirmed by the owner on 19 October 2026 ("do the all implements"). Application code is implemented locally. Production rollout and external services remain pending; see OFFICE-ROLLOUT.md.

- Improvement: UI01 — Chat and notification icons with animated popups.
- Confirmation date: 16 October 2026.
- Scope: Signed-in workspace header icons replace the Messages and Notifications sidebar entries. Existing links open the same popups without leaving the current page.
- Status: Implemented and locally verified; not deployed.
- Acceptance checks: Frontend production build; browser checks with sample data for sending messages, starting conversations, marking notifications read, focus trapping/restoration, Escape close, mobile bounds and reduced motion.
- Completion notes: Existing backend APIs reused. Chat badge now reflects per-conversation unread state. Notification count reflects unread inbox entries.

For each confirmation, record:

- Improvement:
- Confirmation date:
- Agreed scope and roles affected:
- Status:
- Acceptance checks:
- Completion notes:

## Confirmed office improvements

P01–P10: implemented locally on 19 October 2026. Requests require individual signed-in accounts. Employee completion requires SDD/Admin review; previous completed records are preserved. Attachments support PDF, PNG, JPEG, TXT and CSV up to 2 MB. Reminders run daily per task; recurring work requires an active scheduler.

| ID | Improvement | Intended behavior |
| --- | --- | --- |
| P01 | IT service request form | Staff from other divisions submit computer, network or software problems and receive a tracking number. |
| P02 | Completion approval | Employees submit finished work for SDD review. The SDD approves completion or requests changes. Define how this affects existing Completed tasks and reports before implementing. |
| P03 | Deadline and priority alerts | Remind the assigned employee before a deadline and notify the SDD when work becomes overdue. Agree reminder timing and escalation rules. |
| P04 | Task attachments | Attach screenshots, documents and completion evidence. Define permitted file types, size limits, access and retention. |
| P05 | Task comments and history | Keep task discussions together and record changes to assignee, deadline and status. Extend the existing history where needed. |
| P06 | Recurring tasks | Create scheduled assignments for backup checks, equipment inspections and monthly reporting without generating duplicates. |
| P07 | IT asset register | Track devices, serial numbers, assigned staff, warranties and repair history. Link requests and tasks to devices. |
| P08 | Knowledge base | Provide approved troubleshooting guides, office procedures and frequently used documents, with ownership and revision dates. |
| P09 | Workload dashboard | Show each employee's active assignments, overdue work and availability to help the SDD distribute work. |
| P10 | Expanded reports | Extend existing reports with unresolved requests, turnaround time and recurring problems. Define each metric clearly. |

## Confirmed chat improvements

C01–C10: confirmed and implemented locally on 19 October 2026. Includes authorized search, replies, file sharing, task channels, explicit mentions, management pins/announcements, reactions, read markers and notification preferences.

| ID | Improvement | Intended behavior |
| --- | --- | --- |
| C01 | Unread badges | Show which conversations contain new messages and clear the indicator when the user reads them. |
| C02 | Reply to a message | Connect a reply to its original message so staff can follow the discussion. |
| C03 | Chat attachments | Share screenshots, documents and troubleshooting evidence within authorized conversations. Agree file types, size limits and retention. |
| C04 | Message search | Find earlier discussions by keyword, person or date, restricted to conversations the user may access. |
| C05 | Task-linked conversations | Open a discussion from a task and keep related communication together, respecting task and conversation permissions. |
| C06 | @mentions | Notify a selected employee when their attention is needed in a conversation they can access. |
| C07 | Pinned messages | Keep important instructions easy to find. Agree who can pin and unpin messages. |
| C08 | Announcement channel | Allow SDD/Admin to publish office notices that staff can explicitly acknowledge. |
| C09 | Reactions | Let staff acknowledge messages with reactions such as thumbs-up or a check mark without sending another message. |
| C10 | Notification controls | Allow staff to mute conversations and set quiet hours. Agree how these preferences affect mentions and announcements. |

### Initial chat additions — implemented

Unread badges, replies, attachments and message search.

### Announcement acknowledgements and privacy

- Add an explicit **Acknowledged** action for office notices so the SDD can see who confirmed reading an instruction.
- Keep acknowledgements separate from automatic read receipts. Opening a message does not mean the employee has acknowledged the instruction.
- Explain who can access private conversations, including any administrator moderation access. Align this explanation with the actual permissions and audit history.

## Interface improvements

| ID | Improvement | Intended behavior | Status |
| --- | --- | --- | --- |
| UI01 | Chat and notification icons with animated popups | Make chat and notifications accessible through consistent, recognizable icons across signed-in workspace interfaces. Use icons that match the existing design, show unread indicators, and open smoothly animated popups. Support keyboard access, accessible labels, Escape to close, mobile layouts and reduced-motion preferences. Header icons replace the sidebar entries. | Implemented; locally verified |

Added on 15 October 2026 at the project owner's request for the implementation list. Implementation confirmed on 16 October 2026. Completed locally and awaiting deployment.

## Foundation implementation status

Foundation code is implemented locally. Deployment-dependent items are intentionally left unchecked until their real service configuration is tested.

- [x] F01 — Enforce employee, SDD and administrator permissions in the backend.
- [ ] F02 — Login, official email verification and one-time-code password recovery implemented and API tested. Pending: configure mail provider and test actual delivery.
- [ ] F03 — Encrypted daily backup engine and isolated SQLite restoration implemented and tested. Pending: durable backup storage, protected key, off-host copy and production restore drill.
- [x] F04 — Review audit coverage for account changes, task deletion and administrator actions.
- [x] F05 — Provide clear loading states, error messages and retry options.
- [x] F06 — Check keyboard navigation, readable contrast and phone layouts.
- [x] F07 — Define and explain access rules for messages and staff information.

## Implemented workflow

Suggested workflow:

1. A staff member submits a problem.
2. The SDD or administrator assigns it to an IT employee.
3. The employee receives an alert and updates progress.
4. The employee submits a resolution and supporting evidence.
5. The SDD approves the work, and the requester receives confirmation.

Signed-in staff submit their own requests; SDD/Admin assign and approve them. In-app notifications always remain available; browser push requires deployment configuration. See OFFICE-ROLLOUT.md for the exact rules and upgrade sequence.

## Future ideas awaiting a decision

Add newly discussed ideas here until the project owner confirms their scope.

## Change log

- 19 October 2026 — Confirmed all listed items. Added office requests, approval, assets, guides, recurring tasks, workload/reporting, chat features, protected attachments, recovery, reminders, encrypted backups and accessibility updates. Backend automated checks passed (10 passed, 1 MySQL integration test skipped). Production build and isolated real-browser checks passed: request assignment, employee submission, SDD approval, equipment, published guide, reports, chat/reply/search and mobile composer. Live deployment, MySQL upgrade, mail, scheduler and off-host storage remain pending.

- 16 October 2026 — Implemented UI01 with header icons, unread indicators, responsive animated popups, keyboard controls and reduced-motion support. Production build and mocked browser checks passed. Not deployed.

- 15 October 2026 — Added UI01: chat and notification icons across workspace interfaces with animated popups. Recorded as a proposal following the owner's clarification.
- 15 October 2026 — Added ten proposed chat improvements, suggested initial priorities, announcement acknowledgements and chat privacy guidance. No application changes made.
- 15 October 2026 — Created at the project owner's request. Recorded the proposed office workspace improvements and a process for tracking future confirmations. No application changes made.


