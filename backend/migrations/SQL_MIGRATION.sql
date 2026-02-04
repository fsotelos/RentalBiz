-- SQL Migration Script for Payment Approval Workflow
-- Run this in your MySQL database
-- RentalBiz - Sistema de Gestión de Propiedades

-- =====================================================
-- PART 1: Create payment_approvals table
-- =====================================================

CREATE TABLE IF NOT EXISTS `payment_approvals` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `payment_id` VARCHAR(36) NOT NULL,
  `submitted_by` VARCHAR(36) NOT NULL,
  `status` ENUM('pending', 'approved', 'rejected', 'resubmitted') NOT NULL DEFAULT 'pending',
  `approved_by` VARCHAR(36) NULL,
  `approved_at` DATETIME NULL,
  `rejection_reason` TEXT NULL,
  `notes` TEXT NULL,
  `metadata` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_payment_approvals_payment_id` (`payment_id`),
  INDEX `idx_payment_approvals_submitted_by` (`submitted_by`),
  INDEX `idx_payment_approvals_status` (`status`),
  INDEX `idx_payment_approvals_approved_by` (`approved_by`),
  INDEX `idx_payment_approvals_created_at` (`created_at`),
  CONSTRAINT `fk_payment_approvals_payment`
    FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payment_approvals_submitted_by`
    FOREIGN KEY (`submitted_by`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payment_approvals_approved_by`
    FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 2: Create audit_logs table
-- =====================================================

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(36) NOT NULL PRIMARY KEY,
  `entity_type` VARCHAR(50) NOT NULL COMMENT 'Type of entity (payment, contract, property, user)',
  `entity_id` VARCHAR(36) NOT NULL COMMENT 'ID of the entity',
  `action` VARCHAR(50) NOT NULL COMMENT 'Action performed',
  `user_id` VARCHAR(36) NOT NULL,
  `old_values` JSON NULL COMMENT 'Previous values before the action',
  `new_values` JSON NULL COMMENT 'New values after the action',
  `ip_address` VARCHAR(45) NULL COMMENT 'Client IP address',
  `user_agent` TEXT NULL COMMENT 'Browser/client user agent',
  `metadata` JSON NULL DEFAULT '{}',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_audit_logs_entity` (`entity_type`, `entity_id`),
  INDEX `idx_audit_logs_user_id` (`user_id`),
  INDEX `idx_audit_logs_action` (`action`),
  INDEX `idx_audit_logs_created_at` (`created_at`),
  INDEX `idx_audit_logs_entity_type` (`entity_type`),
  CONSTRAINT `fk_audit_logs_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 3: Update payments table with new fields
-- =====================================================

-- Add new columns to payments table
ALTER TABLE `payments`
  ADD COLUMN IF NOT EXISTS `requires_approval` BOOLEAN NOT NULL DEFAULT TRUE AFTER `penalty_paid`,
  ADD COLUMN IF NOT EXISTS `submitted_at` DATETIME NULL AFTER `requires_approval`,
  ADD COLUMN IF NOT EXISTS `approved_at` DATETIME NULL AFTER `submitted_at`,
  ADD COLUMN IF NOT EXISTS `rejected_at` DATETIME NULL AFTER `approved_at`,
  ADD COLUMN IF NOT EXISTS `rejection_reason` TEXT NULL AFTER `rejected_at`;

-- =====================================================
-- PART 4: Update ENUM for payment status
-- =====================================================

-- First drop the old enum type if it exists
DROP TYPE IF EXISTS enum_payments_status;

-- Create new enum type with additional values
CREATE TYPE enum_payments_status_new AS ENUM (
  'pending',
  'pending_approval',
  'approved',
  'paid',
  'overdue',
  'rejected',
  'cancelled',
  'partial'
);

-- Update the column to use the new enum type
ALTER TABLE `payments`
  ALTER COLUMN `status` TYPE enum_payments_status_new USING (`status`::text::enum_payments_status_new);

-- =====================================================
-- PART 5: Update notification types
-- =====================================================

-- Drop and recreate the notification type enum
DROP TYPE IF EXISTS enum_notifications_type;

CREATE TYPE enum_notifications_type_new AS ENUM (
  'payment_reminder',
  'payment_overdue',
  'payment_received',
  'payment_submitted',
  'payment_approved',
  'payment_rejected',
  'contract_expiring',
  'contract_renewal',
  'contract_activated',
  'contract_terminated',
  'general',
  'system'
);

ALTER TABLE `notifications`
  ALTER COLUMN `type` TYPE enum_notifications_type_new USING (`type`::text::enum_notifications_type_new);

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check if tables were created
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME IN ('payment_approvals', 'audit_logs');

-- Check new columns in payments
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'payments'
AND COLUMN_NAME IN ('requires_approval', 'submitted_at', 'approved_at', 'rejected_at', 'rejection_reason');

-- =====================================================
-- ROLLBACK Script (if needed)
-- =====================================================

-- -- Drop foreign keys first
-- ALTER TABLE `payment_approvals` DROP FOREIGN KEY `fk_payment_approvals_payment`;
-- ALTER TABLE `payment_approvals` DROP FOREIGN KEY `fk_payment_approvals_submitted_by`;
-- ALTER TABLE `payment_approvals` DROP FOREIGN KEY `fk_payment_approvals_approved_by`;
-- ALTER TABLE `audit_logs` DROP FOREIGN KEY `fk_audit_logs_user`;

-- -- Drop tables
-- DROP TABLE IF EXISTS `audit_logs`;
-- DROP TABLE IF EXISTS `payment_approvals`;

-- -- Remove columns from payments
-- ALTER TABLE `payments`
--   DROP COLUMN IF EXISTS `requires_approval`,
--   DROP COLUMN IF EXISTS `submitted_at`,
--   DROP COLUMN IF EXISTS `approved_at`,
--   DROP COLUMN IF EXISTS `rejected_at`,
--   DROP COLUMN IF EXISTS `rejection_reason`;
