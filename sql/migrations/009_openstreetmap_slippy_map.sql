-- Switch the map coordinate system to OpenStreetMap longitude/latitude.
-- x = longitude, y = latitude. Values are stored with six decimals for precise city placement.

ALTER TABLE pcw_ideologies MODIFY x DECIMAL(10,6) NOT NULL DEFAULT 0;
ALTER TABLE pcw_ideologies MODIFY y DECIMAL(10,6) NOT NULL DEFAULT 0;
ALTER TABLE pcw_forts MODIFY x DECIMAL(10,6) NOT NULL DEFAULT 0;
ALTER TABLE pcw_forts MODIFY y DECIMAL(10,6) NOT NULL DEFAULT 0;
ALTER TABLE pcw_players MODIFY x DECIMAL(10,6) NOT NULL DEFAULT 2.352200;
ALTER TABLE pcw_players MODIFY y DECIMAL(10,6) NOT NULL DEFAULT 48.856600;

UPDATE pcw_ideologies SET x = 2.352200, y = 48.856600 WHERE id = 'liberal';
UPDATE pcw_ideologies SET x = 4.835700, y = 45.764000 WHERE id = 'socialdem';
UPDATE pcw_ideologies SET x = 5.724500, y = 45.188500 WHERE id = 'ecologist';
UPDATE pcw_ideologies SET x = 1.444200, y = 43.604700 WHERE id = 'conservative';
UPDATE pcw_ideologies SET x = -1.553600, y = 47.218400 WHERE id = 'sovereignist';
UPDATE pcw_ideologies SET x = 7.261900, y = 43.710200 WHERE id = 'libertarian';

UPDATE pcw_forts SET x = 2.316600, y = 48.870500 WHERE name = 'Palais de l’Élysée' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 2.320100, y = 48.861600 WHERE name = 'Assemblée nationale' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 2.352200, y = 48.856600 WHERE name = 'Mairie de Paris' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 5.369800, y = 43.296500 WHERE name = 'Mairie de Marseille' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 4.835700, y = 45.764000 WHERE name = 'Mairie de Lyon' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 1.444200, y = 43.604700 WHERE name = 'Mairie de Toulouse' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 7.261900, y = 43.710200 WHERE name = 'Mairie de Nice' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 2.363000, y = 48.867500 WHERE name = 'Place de la République' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = -1.553600, y = 47.218400 WHERE name = 'Rond-point populaire' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = -0.579200, y = 44.837800 WHERE name = 'Préfecture régionale de Bordeaux' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 5.724500, y = 45.188500 WHERE name = 'Université militante de Grenoble' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 2.252200, y = 48.839700 WHERE name = 'Plateau média' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 2.350500, y = 48.749700 WHERE name = 'Marché national de Rungis' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 6.971900, y = 43.621300 WHERE name = 'Commune verte' AND created_by_player_id IS NULL;

UPDATE pcw_players SET x = 2.352200, y = 48.856600 WHERE y < 35 OR x > 20;
DELETE FROM pcw_game_states;
