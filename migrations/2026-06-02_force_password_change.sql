-- Adds forced-password-change support to students table
ALTER TABLE students
  ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0 AFTER password,
  ADD COLUMN password_updated_at TIMESTAMP NULL DEFAULT NULL AFTER must_change_password;
