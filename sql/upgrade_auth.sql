-- Run this only if you already installed the previous persistence prototype.
-- If you import schema.sql from scratch, you do not need this file.

ALTER TABLE pcw_players ADD COLUMN password_hash VARCHAR(255) NULL AFTER ideology_id;
ALTER TABLE pcw_players ADD COLUMN auth_token VARCHAR(128) NULL AFTER password_hash;
ALTER TABLE pcw_players ADD UNIQUE KEY pcw_players_name_uk (name);
ALTER TABLE pcw_players ADD UNIQUE KEY pcw_players_auth_token_uk (auth_token);
