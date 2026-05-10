<?php
/**
 * Database-backed game configuration endpoint.
 */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

try {
    $db = pcw_db();

    $ideologies = $db->query(
        'SELECT id, name, color, x, y, influence_power, attack_power, repair_power, regen, move_speed
           FROM pcw_ideologies
          WHERE enabled = 1
          ORDER BY sort_order, name'
    )->fetchAll();

    $forts = $db->query(
        'SELECT name, x, y, base_ideology_id, hp
           FROM pcw_forts
          WHERE enabled = 1
          ORDER BY sort_order, id'
    )->fetchAll();

    $classes = $db->query(
        'SELECT id, slug, name, description, image_path, icon, action_name, action_slug, action_type,
                action_description, energy_cost, power, cooldown_seconds, preparation_seconds,
                required_supports, sort_order
           FROM pcw_player_classes
          WHERE enabled = 1
          ORDER BY sort_order, id'
    )->fetchAll();

    $settingsrows = $db->query(
        'SELECT setting_key, setting_value
           FROM pcw_settings'
    )->fetchAll();

    $settings = [];
    foreach ($settingsrows as $row) {
        $settings[(string)$row['setting_key']] = (string)$row['setting_value'];
    }

    pcw_json_response([
        'ideologies' => array_map(static function (array $row): array {
            return [
                'id' => (string)$row['id'],
                'name' => (string)$row['name'],
                'color' => (string)$row['color'],
                'x' => (float)$row['x'],
                'y' => (float)$row['y'],
                'influencePower' => (int)$row['influence_power'],
                'attackPower' => (int)$row['attack_power'],
                'supportPower' => (int)$row['repair_power'],
                'regen' => (int)$row['regen'],
                'moveSpeed' => (float)$row['move_speed'],
            ];
        }, $ideologies),
        'fortTemplates' => array_map(static function (array $row): array {
            return [
                'name' => (string)$row['name'],
                'x' => (float)$row['x'],
                'y' => (float)$row['y'],
                'base' => $row['base_ideology_id'] !== null ? (string)$row['base_ideology_id'] : null,
                'hp' => (int)$row['hp'],
            ];
        }, $forts),
        'playerClasses' => array_map(static function (array $row): array {
            return [
                'id' => (int)$row['id'],
                'slug' => (string)$row['slug'],
                'name' => (string)$row['name'],
                'description' => (string)($row['description'] ?? ''),
                'imagePath' => (string)($row['image_path'] ?? ''),
                'icon' => (string)$row['icon'],
                'actionName' => (string)$row['action_name'],
                'actionSlug' => (string)$row['action_slug'],
                'actionType' => (string)$row['action_type'],
                'actionDescription' => (string)($row['action_description'] ?? ''),
                'energyCost' => (int)$row['energy_cost'],
                'power' => (int)$row['power'],
                'cooldownSeconds' => (int)$row['cooldown_seconds'],
                'preparationSeconds' => (int)$row['preparation_seconds'],
                'requiredSupports' => (int)$row['required_supports'],
                'sortOrder' => (int)$row['sort_order'],
            ];
        }, $classes),
        'actionDebounceMs' => isset($settings['action_debounce_ms']) ? (int)$settings['action_debounce_ms'] : 50,
    ]);
} catch (Throwable $error) {
    pcw_json_response([
        'error' => true,
        'message' => $error->getMessage(),
    ], 500);
}
