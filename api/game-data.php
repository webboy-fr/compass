<?php
/**
 * Database-backed game data endpoint.
 */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

try {
    $db = pcw_db();

    $ideologiesstmt = $db->query(
        'SELECT id, name, color, x, y, influence_power, attack_power, repair_power, regen, move_speed
           FROM pcw_ideologies
          WHERE enabled = 1
          ORDER BY sort_order ASC, name ASC'
    );

    $fortsstmt = $db->query(
        'SELECT name, x, y, base_ideology_id, hp, category
           FROM pcw_forts
          WHERE enabled = 1
          ORDER BY sort_order ASC, id ASC'
    );

    $classesstmt = $db->query(
        'SELECT id, slug, name, description, image_path, icon, action_name, action_slug, action_type,
                action_description, energy_cost, power, cooldown_seconds, preparation_seconds,
                required_supports, sort_order
           FROM pcw_player_classes
          WHERE enabled = 1
          ORDER BY sort_order ASC, id ASC'
    );

    $ideologies = array_map(static function (array $row): array {
        return [
            'id' => $row['id'],
            'name' => $row['name'],
            'color' => $row['color'],
            'x' => (float)$row['x'],
            'y' => (float)$row['y'],
            'influencePower' => (int)$row['influence_power'],
            'attackPower' => (int)$row['attack_power'],
            'supportPower' => (int)$row['repair_power'],
            'regen' => (int)$row['regen'],
            'moveSpeed' => (float)$row['move_speed'],
        ];
    }, $ideologiesstmt ? $ideologiesstmt->fetchAll() : []);

    $forttemplates = array_map(static function (array $row): array {
        return [
            'name' => $row['name'],
            'x' => (float)$row['x'],
            'y' => (float)$row['y'],
            'base' => $row['base_ideology_id'] ?: null,
            'hp' => (int)$row['hp'],
            'category' => $row['category'] ?? 'institution',
        ];
    }, $fortsstmt ? $fortsstmt->fetchAll() : []);

    // Classes and special actions are intentionally disabled in the simplified action model.
    $playerclasses = [];

    pcw_json_response([
        'ideologies' => $ideologies,
        'fortTemplates' => $forttemplates,
        'playerClasses' => $playerclasses,
    ]);
} catch (Throwable $exception) {
    pcw_json_response([
        'error' => $exception->getMessage(),
    ], 500);
}
