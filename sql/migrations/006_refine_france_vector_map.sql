UPDATE pcw_forts SET x = 50.05, y = 25.65 WHERE name = 'Palais de l’Élysée' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 50.55, y = 25.95 WHERE name = 'Assemblée nationale' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 51.05, y = 25.70 WHERE name = 'Mairie de Paris' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 65.90, y = 75.40 WHERE name = 'Mairie de Marseille' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 63.20, y = 53.40 WHERE name = 'Mairie de Lyon' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 45.90, y = 72.60 WHERE name = 'Mairie de Toulouse' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 75.55, y = 71.70 WHERE name = 'Mairie de Nice' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 50.80, y = 25.25 WHERE name = 'Place de la République' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 39.55, y = 33.65 WHERE name = 'Rond-point populaire' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 35.60, y = 61.70 WHERE name = 'Préfecture régionale de Bordeaux' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 67.70, y = 58.55 WHERE name = 'Université militante de Grenoble' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 49.70, y = 26.10 WHERE name = 'Plateau média' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 50.80, y = 27.25 WHERE name = 'Marché national de Rungis' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 52.75, y = 11.70 WHERE name = 'Commune verte' AND created_by_player_id IS NULL;

DELETE FROM pcw_game_states;
