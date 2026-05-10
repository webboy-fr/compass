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
