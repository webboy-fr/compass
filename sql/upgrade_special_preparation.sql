ALTER TABLE pcw_player_classes ADD COLUMN preparation_seconds INT NOT NULL DEFAULT 2 AFTER cooldown_seconds;
ALTER TABLE pcw_player_classes ADD COLUMN required_supports INT NOT NULL DEFAULT 1 AFTER preparation_seconds;

UPDATE pcw_player_classes
   SET preparation_seconds = 2,
       required_supports = 1
 WHERE action_slug IN ('investigation_article', 'viral_video', 'tv_panel');
