-- Replace the handmade France silhouette with an official-like lon/lat projection and finer default fort coordinates.
-- x/y are percentages of the SVG viewBox: x=west->east, y=north->south.
-- Projection bounds used by assets/maps/france.svg: lon [-5.35, 10.13], lat [41.02, 51.27].
UPDATE pcw_forts SET x = 49.5258, y = 23.4088 WHERE name = 'Palais de l’Élysée' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 49.5478, y = 23.4966 WHERE name = 'Assemblée nationale' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 49.7558, y = 23.5454 WHERE name = 'Mairie de Paris' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 69.2494, y = 77.7902 WHERE name = 'Mairie de Marseille' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 65.7991, y = 53.7171 WHERE name = 'Mairie de Lyon' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 43.8902, y = 74.7834 WHERE name = 'Mairie de Toulouse' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 81.4961, y = 73.7541 WHERE name = 'Mairie de Nice' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 49.8256, y = 23.4390 WHERE name = 'Place de la République' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 24.5245, y = 39.5278 WHERE name = 'Rond-point populaire' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 30.8191, y = 62.7532 WHERE name = 'Préfecture régionale de Bordeaux' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 71.5407, y = 59.3317 WHERE name = 'Université militante de Grenoble' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 49.3217, y = 23.7951 WHERE name = 'Plateau média' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 49.7545, y = 24.5659 WHERE name = 'Marché national de Rungis' AND created_by_player_id IS NULL;
UPDATE pcw_forts SET x = 84.6389, y = 26.3083 WHERE name = 'Commune verte' AND created_by_player_id IS NULL;
DELETE FROM pcw_game_states;
