-- Refine default fort coordinates on a France lon/lat-like normalized projection.
-- x/y are percentages of the SVG viewBox: x=west->east, y=north->south.
UPDATE pcw_forts SET x = 49.783, y = 23.592 WHERE name = 'Palais de l’Élysée' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 49.809, y = 23.670 WHERE name = 'Assemblée nationale' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 50.013, y = 23.718 WHERE name = 'Mairie de Paris' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 69.229, y = 77.709 WHERE name = 'Mairie de Marseille' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 65.828, y = 53.748 WHERE name = 'Mairie de Lyon' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 44.229, y = 74.718 WHERE name = 'Mairie de Toulouse' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 81.287, y = 73.689 WHERE name = 'Mairie de Nice' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 50.089, y = 23.621 WHERE name = 'Place de la République' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 24.350, y = 30.903 WHERE name = 'Rond-point populaire' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 31.344, y = 62.748 WHERE name = 'Préfecture régionale de Bordeaux' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 71.490, y = 59.340 WHERE name = 'Université militante de Grenoble' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 49.554, y = 23.883 WHERE name = 'Plateau média' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 50.013, y = 24.767 WHERE name = 'Marché national de Rungis' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 78.758, y = 25.961 WHERE name = 'Commune verte' AND created_by_player_id IS NULL;
DELETE FROM pcw_game_states;
