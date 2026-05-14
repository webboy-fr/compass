SET @category_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pcw_forts' AND COLUMN_NAME = 'category');
SET @category_sql := IF(@category_exists = 0, 'ALTER TABLE pcw_forts ADD COLUMN category VARCHAR(40) NOT NULL DEFAULT \'institution\' AFTER hp', 'SELECT 1');
PREPARE category_stmt FROM @category_sql;
EXECUTE category_stmt;
DEALLOCATE PREPARE category_stmt;

SET @created_by_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pcw_forts' AND COLUMN_NAME = 'created_by_player_id');
SET @created_by_sql := IF(@created_by_exists = 0, 'ALTER TABLE pcw_forts ADD COLUMN created_by_player_id INT NULL AFTER category', 'SELECT 1');
PREPARE created_by_stmt FROM @created_by_sql;
EXECUTE created_by_stmt;
DEALLOCATE PREPARE created_by_stmt;

DELETE FROM pcw_forts WHERE created_by_player_id IS NULL;
DELETE FROM pcw_game_states;

INSERT INTO pcw_forts (name, x, y, base_ideology_id, hp, category, enabled, sort_order) VALUES
('Palais de l’Élysée', 50.05, 25.65, NULL, 100, 'institution', 1, 10),
('Assemblée nationale', 50.55, 25.95, NULL, 100, 'institution', 1, 20),
('Mairie de Paris', 51.05, 25.70, 'socialdem', 100, 'mairie', 1, 30),
('Mairie de Marseille', 65.90, 75.40, 'liberal', 100, 'mairie', 1, 40),
('Mairie de Lyon', 63.20, 53.40, 'conservative', 100, 'mairie', 1, 50),
('Mairie de Toulouse', 45.90, 72.60, 'socialdem', 100, 'mairie', 1, 60),
('Mairie de Nice', 75.55, 71.70, 'liberal', 100, 'mairie', 1, 70),
('Place de la République', 50.80, 25.25, NULL, 100, 'bonus', 1, 80),
('Rond-point populaire', 39.55, 33.65, 'sovereignist', 100, 'bonus', 1, 90),
('Préfecture régionale de Bordeaux', 35.60, 61.70, 'conservative', 100, 'bonus', 1, 100),
('Université militante de Grenoble', 67.70, 58.55, 'ecologist', 100, 'bonus', 1, 110),
('Plateau média', 49.70, 26.10, NULL, 100, 'bonus', 1, 120),
('Marché national de Rungis', 50.80, 27.25, 'liberal', 100, 'bonus', 1, 130),
('Commune verte', 52.75, 11.70, 'ecologist', 100, 'bonus', 1, 140);
