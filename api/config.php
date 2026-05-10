<?php
/**
 * Runtime game configuration loaded from the database.
 */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

try {
    $db = pcw_db();

    $ideologies = $db->query('SELECT id, name, color, x, y, influence_power, attack_power, repair_power, regen, move_speed FROM pcw_ideologies WHERE enabled = 1 ORDER BY sort_order, name')->fetchAll();
    $forts = $db->query('SELECT name, x, y, base_ideology_id, hp FROM pcw_forts WHERE enabled = 1 ORDER BY sort_order, id')->fetchAll();
    $classes = $db->query('SELECT id, name, slug, description, image_path, icon, action_name, action_slug, action_type, action_description, energy_cost, power, cooldown_seconds, preparation_seconds, required_supports, sort_order FROM pcw_player_classes WHERE enabled = 1 ORDER BY sort_order, name')->fetchAll();
    $settings = [];
    try {
        $settingsRows = $db->query('SELECT setting_key, setting_value FROM pcw_settings')->fetchAll();
        foreach ($settingsRows as $settingRow) {
            $settings[(string)$settingRow['setting_key']] = (string)$settingRow['setting_value'];
        }
    } catch (Throwable $ignored) {
        $settings = [];
    }

    $payload = [
        'ideologies' => array_map(static function (array $item): array {
            return [
                'id' => $item['id'],
                'name' => $item['name'],
                'color' => $item['color'],
                'x' => (float)$item['x'],
                'y' => (float)$item['y'],
                'influencePower' => (int)$item['influence_power'],
                'attackPower' => (int)$item['attack_power'],
                'supportPower' => (int)$item['repair_power'],
                'regen' => (int)$item['regen'],
                'moveSpeed' => (float)$item['move_speed'],
            ];
        }, $ideologies),
        'playerClasses' => array_map(static function (array $item): array {
            return [
                'id' => (int)$item['id'],
                'name' => $item['name'],
                'slug' => $item['slug'],
                'description' => $item['description'] ?: '',
                'imagePath' => $item['image_path'] ?: '',
                'icon' => $item['icon'] ?: '🎭',
                'actionName' => $item['action_name'],
                'actionSlug' => $item['action_slug'],
                'actionType' => $item['action_type'],
                'actionDescription' => $item['action_description'] ?: '',
                'energyCost' => (int)$item['energy_cost'],
                'power' => (int)$item['power'],
                'cooldownSeconds' => (int)$item['cooldown_seconds'],
                'preparationSeconds' => (int)$item['preparation_seconds'],
                'requiredSupports' => (int)$item['required_supports'],
                'sortOrder' => (int)$item['sort_order'],
            ];
        }, $classes),
        'actionDebounceMs' => max(0, min(1000, (int)($settings['action_debounce_ms'] ?? 50))),
        'fortTemplates' => array_map(static function (array $item): array {
            return [
                'name' => $item['name'],
                'x' => (float)$item['x'],
                'y' => (float)$item['y'],
                'base' => $item['base_ideology_id'] ?: null,
                'hp' => (int)$item['hp'],
            ];
        }, $forts),
    ];

    pcw_json_response($payload);
} catch (Throwable $error) {
    pcw_json_response(['error' => $error->getMessage()], 500);
}
