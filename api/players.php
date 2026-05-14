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
        $action = pcw_string($body['action'] ?? ($_GET['action'] ?? ''), '', 40);

        if ($action === 'move') {
            $token = pcw_string($_GET['token'] ?? ($body['token'] ?? ''), '', 128);
            $player = pcw_find_player_by_token($db, $token);
            if (!$player) {
                pcw_json_response(['error' => 'Authentication required.'], 401);
            }

            $x = pcw_float($body['x'] ?? 2.3522, 2.3522, -6, 10);
            $y = pcw_float($body['y'] ?? 48.8566, 48.8566, 41, 52);

            $movementview = pcw_player_movement_view($player);
            $fromx = (float)$movementview['x'];
            $fromy = (float)$movementview['y'];

            $movespeed = 10.0;
            if (!empty($player['ideology_id'])) {
                $speedstmt = $db->prepare('SELECT move_speed FROM pcw_ideologies WHERE id = :id LIMIT 1');
                $speedstmt->execute(['id' => $player['ideology_id']]);
                $movespeed = (float)($speedstmt->fetchColumn() ?: 10);
            }

            $durationms = pcw_compute_player_movement_duration_ms($fromx, $fromy, $x, $y, $movespeed);
            $startedms = pcw_utc_now_ms();

            // Store the destination as the durable x/y value, and store the UTC movement
            // timeline separately so all browsers render the same smooth transition.
            $stmt = $db->prepare(
                'UPDATE pcw_players
                    SET x = :x,
                        y = :y,
                        movement_from_x = :fromx,
                        movement_from_y = :fromy,
                        movement_to_x = :tox,
                        movement_to_y = :toy,
                        movement_started_at_ms = :startedms,
                        movement_duration_ms = :durationms,
                        updated_at = UTC_TIMESTAMP()
                  WHERE id = :id AND enabled = 1'
            );
            $stmt->execute([
                'x' => $x,
                'y' => $y,
                'fromx' => $fromx,
                'fromy' => $fromy,
                'tox' => $x,
                'toy' => $y,
                'startedms' => $startedms,
                'durationms' => $durationms,
                'id' => (int)$player['id'],
            ]);

            $updated = pcw_find_player_by_token($db, $token);
            pcw_json_response([
                'ok' => true,
                'x' => $x,
                'y' => $y,
                'movement' => [
                    'fromX' => $fromx,
                    'fromY' => $fromy,
                    'toX' => $x,
                    'toY' => $y,
                    'startedAtMs' => $startedms,
                    'durationMs' => $durationms,
                ],
                'player' => $updated ?: null,
            ]);
        }

        $stmt = $db->prepare('INSERT INTO pcw_players (name, ideology_id, color, x, y, energy, enabled) VALUES (:name, :ideology_id, :color, :x, :y, :energy, 1)');
        $stmt->execute([
            'name' => pcw_string($body['name'] ?? '', 'Joueur', 120),
            'ideology_id' => pcw_string($body['ideology_id'] ?? '', '', 64) ?: null,
            'color' => pcw_string($body['color'] ?? '#ffffff', '#ffffff', 20),
            'x' => pcw_float($body['x'] ?? 2.3522, 2.3522, -6, 10),
            'y' => pcw_float($body['y'] ?? 48.8566, 48.8566, 41, 52),
            'energy' => pcw_int($body['energy'] ?? 45, 45, 0, 1000),
        ]);
        pcw_json_response(['ok' => true, 'id' => (int)$db->lastInsertId()], 201);
    }

    pcw_json_response(['error' => 'Unsupported method.'], 405);
} catch (Throwable $error) {
    pcw_json_response(['error' => $error->getMessage()], 500);
}
