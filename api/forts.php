<?php
/**
 * Forts API.
 */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

try {
    $db = pcw_db();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        pcw_json_response($db->query('SELECT * FROM pcw_forts WHERE enabled = 1 ORDER BY sort_order, id')->fetchAll());
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $token = pcw_string($_GET['token'] ?? '', '', 128);
        $playerrow = pcw_find_player_by_token($db, $token);
        if (!$playerrow) {
            pcw_json_response(['error' => 'Authentication required.'], 401);
        }

        $body = pcw_read_json_body();
        $name = trim(pcw_string($body['name'] ?? '', '', 80));
        if ($name === '') {
            throw new InvalidArgumentException('Le nom du bastion est obligatoire.');
        }

        $stmt = $db->prepare('INSERT INTO pcw_forts (name, x, y, base_ideology_id, hp, category, created_by_player_id, enabled, sort_order) VALUES (:name, :x, :y, NULL, 100, :category, :created_by_player_id, 1, :sort_order)');
        $stmt->execute([
            'name' => $name,
            'x' => pcw_float($body['x'] ?? 2.3522, 2.3522, -6, 10),
            'y' => pcw_float($body['y'] ?? 48.8566, 48.8566, 41, 52),
            'category' => 'player_created',
            'created_by_player_id' => (int)$playerrow['id'],
            'sort_order' => pcw_int($body['sort_order'] ?? 1000, 1000, -10000, 10000),
        ]);
        pcw_json_response(['ok' => true, 'id' => (int)$db->lastInsertId()], 201);
    }

    pcw_json_response(['error' => 'Unsupported method.'], 405);
} catch (Throwable $error) {
    pcw_json_response(['error' => $error->getMessage()], 500);
}
