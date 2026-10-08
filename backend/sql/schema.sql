-- IT Unit Workspace relational MySQL / MariaDB schema
-- Select the application database before running. All timestamps are UTC.
CREATE TABLE IF NOT EXISTS workspace_meta (id INT PRIMARY KEY, revision BIGINT NOT NULL) ENGINE=InnoDB;
INSERT IGNORE INTO workspace_meta (id,revision) VALUES (1,0);
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `designation` VARCHAR(200) NOT NULL,
  `role` ENUM('employee','sdd','admin') NOT NULL,
  `username` VARCHAR(200) NOT NULL UNIQUE,
  `email` VARCHAR(200) NOT NULL,
  `phone` VARCHAR(200) NOT NULL,
  `active` BOOLEAN NOT NULL,
  `password_hash` VARCHAR(300) NOT NULL,
  `position` INT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tasks` (
  `id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NOT NULL,
  `division` VARCHAR(200) NOT NULL,
  `assignee_id` VARCHAR(64) NOT NULL,
  `status` ENUM('Assigned','In Progress','Blocked','Completed') NOT NULL,
  `progress` DECIMAL(5,2) NOT NULL,
  `priority` ENUM('Low','Medium','High') NOT NULL,
  `due_date` DATE NOT NULL,
  `created_at` DATETIME(3) NOT NULL,
  `created_by` VARCHAR(64) NOT NULL,
  `completed_at` DATETIME(3),
  `completed_by` VARCHAR(64),
  `resolution` TEXT NOT NULL,
  `completion_employee_name` VARCHAR(200),
  `completion_division` VARCHAR(200),
  `deleted` BOOLEAN NOT NULL DEFAULT FALSE,
  `position` INT NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`assignee_id`) REFERENCES `users` (`id`),
  FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  FOREIGN KEY (`completed_by`) REFERENCES `users` (`id`),
  CHECK (progress BETWEEN 0 AND 100),
  INDEX tasks_assignee_status (assignee_id,status),
  INDEX tasks_completed (completed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `task_updates` (
  `task_id` VARCHAR(64) NOT NULL,
  `position` INT NOT NULL,
  `id` VARCHAR(64) NOT NULL,
  `actor_id` VARCHAR(64) NOT NULL,
  `note` TEXT NOT NULL,
  `progress` DECIMAL(5,2) NOT NULL,
  `status` VARCHAR(200) NOT NULL,
  `created_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`task_id`,`position`),
  FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`),
  FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `task_events` (
  `task_id` VARCHAR(64) NOT NULL,
  `position` INT NOT NULL,
  `status` VARCHAR(200) NOT NULL,
  `created_at` DATETIME(3) NOT NULL,
  `actor_id` VARCHAR(64) NOT NULL,
  `assignee_id` VARCHAR(64) NOT NULL,
  PRIMARY KEY (`task_id`,`position`),
  FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`),
  FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`),
  FOREIGN KEY (`assignee_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `conversations` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `type` ENUM('direct','group') NOT NULL,
  `position` INT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `conversation_members` (
  `conversation_id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `position` INT NOT NULL,
  PRIMARY KEY (`conversation_id`,`user_id`),
  FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `messages` (
  `id` VARCHAR(64) NOT NULL,
  `conversation_id` VARCHAR(64) NOT NULL,
  `sender_id` VARCHAR(64) NOT NULL,
  `body` TEXT NOT NULL,
  `sent_at` DATETIME(3) NOT NULL,
  `edited_at` DATETIME(3),
  `position` INT NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`),
  FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`),
  INDEX messages_conversation (conversation_id,sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `meetings` (
  `id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `agenda` TEXT NOT NULL,
  `starts_at` DATETIME(3) NOT NULL,
  `location` VARCHAR(500) NOT NULL,
  `created_by` VARCHAR(64) NOT NULL,
  `cancelled` BOOLEAN NOT NULL,
  `position` INT NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `meeting_attendees` (
  `meeting_id` VARCHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `response` ENUM('Accepted','Declined') NULL,
  `position` INT NOT NULL,
  PRIMARY KEY (`meeting_id`,`user_id`),
  FOREIGN KEY (`meeting_id`) REFERENCES `meetings` (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(64) NOT NULL,
  `recipient_id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `body` TEXT NOT NULL,
  `is_read` BOOLEAN NOT NULL,
  `created_at` DATETIME(3) NOT NULL,
  `position` INT NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`),
  INDEX notifications_recipient (recipient_id,is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` VARCHAR(64) NOT NULL,
  `actor_id` VARCHAR(64) NOT NULL,
  `action` VARCHAR(200) NOT NULL,
  `record_id` VARCHAR(200) NOT NULL,
  `created_at` DATETIME(3) NOT NULL,
  `position` INT NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`actor_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sessions` (
  `token` VARCHAR(128) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `position` INT NOT NULL,
  PRIMARY KEY (`token`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `push_subscriptions` (
  `endpoint_hash` CHAR(64) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `endpoint` TEXT NOT NULL,
  `p256dh` TEXT NOT NULL,
  `auth` VARCHAR(200) NOT NULL,
  `expiration_time` BIGINT NULL,
  `position` INT NOT NULL,
  PRIMARY KEY (`endpoint_hash`),
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `push_outbox` (
  `id` VARCHAR(64) NOT NULL,
  `recipient_id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `attempts` INT NOT NULL,
  `next_attempt_at` DATETIME(3) NOT NULL,
  `position` INT NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
