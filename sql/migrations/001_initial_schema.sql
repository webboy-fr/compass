CREATE TABLE IF NOT EXISTS pcw_ideologies (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT '#ffffff',
  x DECIMAL(8,2) NOT NULL DEFAULT 0,
  y DECIMAL(8,2) NOT NULL DEFAULT 0,
  influence_power INT NOT NULL DEFAULT 10,
  attack_power INT NOT NULL DEFAULT 10,
  repair_power INT NOT NULL DEFAULT 10,
  regen INT NOT NULL DEFAULT 6,
  move_speed DECIMAL(8,2) NOT NULL DEFAULT 10,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pcw_forts (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  x DECIMAL(8,2) NOT NULL DEFAULT 0,
  y DECIMAL(8,2) NOT NULL DEFAULT 0,
  base_ideology_id VARCHAR(64) NULL,
  hp INT NOT NULL DEFAULT 100,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pcw_forts_base_ideology_fk FOREIGN KEY (base_ideology_id) REFERENCES pcw_ideologies(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS pcw_player_classes (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(80) NOT NULL,
  description TEXT NULL,
  image_path VARCHAR(255) NULL,
  icon VARCHAR(20) NOT NULL DEFAULT '🎭',
  action_name VARCHAR(120) NOT NULL,
  action_slug VARCHAR(80) NOT NULL,
  action_type ENUM('attack','influence','support') NOT NULL,
  action_description TEXT NULL,
  energy_cost INT NOT NULL DEFAULT 10,
  power INT NOT NULL DEFAULT 10,
  cooldown_seconds INT NOT NULL DEFAULT 0,
  preparation_seconds INT NOT NULL DEFAULT 2,
  required_supports INT NOT NULL DEFAULT 1,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY pcw_player_classes_slug_uk (slug),
  UNIQUE KEY pcw_player_classes_action_slug_uk (action_slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pcw_players (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  ideology_id VARCHAR(64) NULL,
  class_id INT NULL,
  password_hash VARCHAR(255) NULL,
  auth_token VARCHAR(128) NULL,
  color VARCHAR(20) NOT NULL DEFAULT '#ffffff',
  x DECIMAL(8,2) NOT NULL DEFAULT 0,
  y DECIMAL(8,2) NOT NULL DEFAULT 0,
  energy INT NOT NULL DEFAULT 45,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY pcw_players_name_uk (name),
  UNIQUE KEY pcw_players_auth_token_uk (auth_token),
  CONSTRAINT pcw_players_ideology_fk FOREIGN KEY (ideology_id) REFERENCES pcw_ideologies(id) ON DELETE SET NULL,
  CONSTRAINT pcw_players_class_fk FOREIGN KEY (class_id) REFERENCES pcw_player_classes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pcw_game_states (
  state_key VARCHAR(80) NOT NULL PRIMARY KEY,
  state_json MEDIUMTEXT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS pcw_chat_messages (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  player_id INT NOT NULL,
  player_name VARCHAR(120) NOT NULL,
  message VARCHAR(200) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX pcw_chat_messages_created_idx (created_at),
  INDEX pcw_chat_messages_player_idx (player_id),
  CONSTRAINT pcw_chat_messages_player_fk FOREIGN KEY (player_id) REFERENCES pcw_players(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS pcw_settings (
  setting_key VARCHAR(80) NOT NULL PRIMARY KEY,
  setting_value VARCHAR(255) NOT NULL,
  label VARCHAR(160) NOT NULL,
  description TEXT NULL,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
