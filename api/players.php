<?php
/**
 * Minimal players API for future front usage.
 */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

try {
    $db = pcw_db();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        pcw_json_response($db->query('SELECT * FROM pcw_players WHERE enabled = 1 ORDER BY id DESC')->fetchAll());
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $body = pcw_read_json_body();
        $stmt = $db->prepare('INSERT INTO pcw_players (name, ideology_id, color, x, y, energy, enabled) VALUES (:name, :ideology_id, :color, :x, :y, :energy, 1)');
        $stmt->execute([
            'name' => pcw_string($body['name'] ?? '', 'Joueur', 120),
            'ideology_id' => pcw_string($body['ideology_id'] ?? '', '', 64) ?: null,
            'color' => pcw_string($body['color'] ?? '#ffffff', '#ffffff', 20),
            'x' => pcw_float($body['x'] ?? 0, 0, -100, 100),
            'y' => pcw_float($body['y'] ?? 0, 0, -100, 100),
            'energy' => pcw_int($body['energy'] ?? 45, 45, 0, 1000),
        ]);
        pcw_json_response(['ok' => true, 'id' => (int)$db->lastInsertId()], 201);
    }

    pcw_json_response(['error' => 'Unsupported method.'], 405);
} catch (Throwable $error) {
    pcw_json_response(['error' => $error->getMessage()], 500);
}
