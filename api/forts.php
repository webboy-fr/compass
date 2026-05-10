<?php
/**
 * Minimal forts API for future front usage.
 */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

try {
    $db = pcw_db();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        pcw_json_response($db->query('SELECT * FROM pcw_forts WHERE enabled = 1 ORDER BY sort_order, id')->fetchAll());
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $body = pcw_read_json_body();
        $stmt = $db->prepare('INSERT INTO pcw_forts (name, x, y, base_ideology_id, hp, enabled, sort_order) VALUES (:name, :x, :y, :base_ideology_id, :hp, 1, :sort_order)');
        $stmt->execute([
            'name' => pcw_string($body['name'] ?? '', 'Sans nom', 160),
            'x' => pcw_float($body['x'] ?? 0, 0, -100, 100),
            'y' => pcw_float($body['y'] ?? 0, 0, -100, 100),
            'base_ideology_id' => pcw_string($body['base_ideology_id'] ?? '', '', 64) ?: null,
            'hp' => pcw_int($body['hp'] ?? 100, 100, 1, 1000),
            'sort_order' => pcw_int($body['sort_order'] ?? 0, 0, -10000, 10000),
        ]);
        pcw_json_response(['ok' => true, 'id' => (int)$db->lastInsertId()], 201);
    }

    pcw_json_response(['error' => 'Unsupported method.'], 405);
} catch (Throwable $error) {
    pcw_json_response(['error' => $error->getMessage()], 500);
}
