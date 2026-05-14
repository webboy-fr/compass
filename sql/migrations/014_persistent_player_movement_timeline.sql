SET @column_exists := (
  SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'pcw_players'
     AND COLUMN_NAME = 'movement_from_x'
);
SET @ddl := IF(@column_exists = 0, 'ALTER TABLE pcw_players ADD COLUMN movement_from_x DECIMAL(10,6) NULL DEFAULT NULL AFTER energy', 'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'pcw_players'
     AND COLUMN_NAME = 'movement_from_y'
);
SET @ddl := IF(@column_exists = 0, 'ALTER TABLE pcw_players ADD COLUMN movement_from_y DECIMAL(10,6) NULL DEFAULT NULL AFTER movement_from_x', 'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'pcw_players'
     AND COLUMN_NAME = 'movement_to_x'
);
SET @ddl := IF(@column_exists = 0, 'ALTER TABLE pcw_players ADD COLUMN movement_to_x DECIMAL(10,6) NULL DEFAULT NULL AFTER movement_from_y', 'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'pcw_players'
     AND COLUMN_NAME = 'movement_to_y'
);
SET @ddl := IF(@column_exists = 0, 'ALTER TABLE pcw_players ADD COLUMN movement_to_y DECIMAL(10,6) NULL DEFAULT NULL AFTER movement_to_x', 'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'pcw_players'
     AND COLUMN_NAME = 'movement_started_at_ms'
);
SET @ddl := IF(@column_exists = 0, 'ALTER TABLE pcw_players ADD COLUMN movement_started_at_ms BIGINT NULL DEFAULT NULL AFTER movement_to_y', 'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @column_exists := (
  SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'pcw_players'
     AND COLUMN_NAME = 'movement_duration_ms'
);
SET @ddl := IF(@column_exists = 0, 'ALTER TABLE pcw_players ADD COLUMN movement_duration_ms INT NULL DEFAULT NULL AFTER movement_started_at_ms', 'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
