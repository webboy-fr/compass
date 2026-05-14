INSERT INTO pcw_ideologies (
    id,
    name,
    color,
    x,
    y,
    influence_power,
    attack_power,
    repair_power,
    regen,
    move_speed,
    sort_order
) VALUES
('liberal', 'Libéral', '#42d392', 54, 50, 12, 9, 8, 6, 12, 1),
('socialdem', 'Social-démocrate', '#ffb84d', 45, 52, 11, 7, 11, 6, 7, 2),
('ecologist', 'Écologiste', '#7bd957', 38, 50, 10, 7, 12, 6, 12, 3),
('conservative', 'Conservateur', '#579dff', 58, 47, 10, 10, 8, 6, 12, 4),
('sovereignist', 'Souverainiste', '#ff5d6c', 43, 58, 9, 12, 7, 6, 12, 5),
('libertarian', 'Libertarien', '#36dce8', 62, 55, 13, 9, 7, 6, 12, 6)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    color = VALUES(color),
    x = VALUES(x),
    y = VALUES(y),
    influence_power = VALUES(influence_power),
    attack_power = VALUES(attack_power),
    repair_power = VALUES(repair_power),
    regen = VALUES(regen),
    move_speed = VALUES(move_speed),
    sort_order = VALUES(sort_order),
    enabled = 1;

INSERT INTO pcw_player_classes (
    id,
    name,
    slug,
    description,
    image_path,
    icon,
    action_name,
    action_slug,
    action_type,
    action_description,
    energy_cost,
    power,
    cooldown_seconds,
    preparation_seconds,
    required_supports,
    sort_order,
    enabled
) VALUES
(1, 'Journaliste', 'journalist', 'Révèle et fragilise les positions adverses avec des articles ciblés.', 'assets/classes/journalist.svg', '📰', 'Article d’enquête', 'investigation_article', 'attack', 'Une attaque spéciale plus lisible et scénarisée.', 18, 16, 0, 2, 1, 10, 1),
(2, 'Influenceur', 'influencer', 'Fait basculer l’opinion vite avec des contenus viraux.', 'assets/classes/influencer.svg', '📹', 'Vidéo virale', 'viral_video', 'influence', 'Une poussée d’influence rapide sur la place forte sélectionnée.', 22, 20, 0, 2, 1, 20, 1),
(3, 'Expert', 'expert', 'Renforce un camp avec une parole perçue comme crédible.', 'assets/classes/expert.svg', '🎙️', 'Plateau télé', 'tv_panel', 'support', 'Un soutien spécial qui restaure la place forte.', 16, 15, 0, 2, 1, 30, 1)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    image_path = VALUES(image_path),
    icon = VALUES(icon),
    action_name = VALUES(action_name),
    action_type = VALUES(action_type),
    action_description = VALUES(action_description),
    energy_cost = VALUES(energy_cost),
    power = VALUES(power),
    cooldown_seconds = VALUES(cooldown_seconds),
    preparation_seconds = VALUES(preparation_seconds),
    required_supports = VALUES(required_supports),
    sort_order = VALUES(sort_order),
    enabled = VALUES(enabled);
