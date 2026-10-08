-- In phpMyAdmin select it_unit_workspace, open SQL, and run these queries.
USE it_unit_workspace;

SELECT id, name, designation, role, username, email, phone, active FROM users ORDER BY position;

SELECT t.id, t.title, u.name AS assigned_to, t.division, t.status, t.progress,
       t.priority, t.due_date, t.completed_at, t.resolution
FROM tasks t JOIN users u ON u.id = t.assignee_id
WHERE t.deleted = FALSE ORDER BY t.created_at DESC;

SELECT t.title, u.name AS updated_by, h.status, h.progress, h.note, h.created_at
FROM task_updates h JOIN tasks t ON t.id = h.task_id
JOIN users u ON u.id = h.actor_id ORDER BY h.created_at DESC;

SELECT c.name AS conversation, u.name AS sender, m.body, m.sent_at
FROM messages m JOIN conversations c ON c.id=m.conversation_id
JOIN users u ON u.id=m.sender_id ORDER BY m.sent_at DESC;

SELECT title, starts_at, location, cancelled FROM meetings ORDER BY starts_at;

SELECT u.name AS recipient, n.title, n.body, n.is_read, n.created_at
FROM notifications n JOIN users u ON u.id=n.recipient_id ORDER BY n.created_at DESC;

-- All stored times are UTC. Add 330 minutes to display Sri Lanka local time.
SELECT title, DATE_ADD(completed_at, INTERVAL 330 MINUTE) AS completed_in_sri_lanka
FROM tasks WHERE status='Completed';
