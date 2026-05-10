SET @column_exists := (
  SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'pcw_players'
     AND COLUMN_NAME = 'ideology_weights'
);

SET @ddl := IF(
  @column_exists = 0,
  'ALTER TABLE pcw_players ADD COLUMN ideology_weights TEXT NULL AFTER ideology_id',
  'SELECT 1'
);

PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
