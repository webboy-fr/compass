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

ALTER TABLE pcw_players ADD COLUMN class_id INT NULL AFTER ideology_id;
ALTER TABLE pcw_players ADD CONSTRAINT pcw_players_class_fk FOREIGN KEY (class_id) REFERENCES pcw_player_classes(id) ON DELETE SET NULL;

INSERT INTO pcw_player_classes (id, name, slug, description, image_path, icon, action_name, action_slug, action_type, action_description, energy_cost, power, cooldown_seconds, preparation_seconds, required_supports, sort_order, enabled) VALUES
(1, 'Journaliste', 'journalist', 'Révèle et fragilise les positions adverses avec des articles ciblés.', 'assets/classes/journalist.svg', '📰', 'Article d’enquête', 'investigation_article', 'attack', 'Une attaque spéciale plus lisible et scénarisée.', 18, 16, 0, 2, 1, 10, 1),
(2, 'Influenceur', 'influencer', 'Fait basculer l’opinion vite avec des contenus viraux.', 'assets/classes/influencer.svg', '📹', 'Vidéo virale', 'viral_video', 'influence', 'Une poussée d’influence rapide sur la place forte sélectionnée.', 22, 20, 0, 2, 1, 20, 1),
(3, 'Expert', 'expert', 'Renforce un camp avec une parole perçue comme crédible.', 'assets/classes/expert.svg', '🎙️', 'Plateau télé', 'tv_panel', 'support', 'Un soutien spécial qui restaure la place forte.', 16, 15, 0, 2, 1, 30, 1)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), image_path = VALUES(image_path), icon = VALUES(icon), action_name = VALUES(action_name), action_type = VALUES(action_type), action_description = VALUES(action_description), energy_cost = VALUES(energy_cost), power = VALUES(power), cooldown_seconds = VALUES(cooldown_seconds), preparation_seconds = VALUES(preparation_seconds), required_supports = VALUES(required_supports), sort_order = VALUES(sort_order), enabled = VALUES(enabled);
