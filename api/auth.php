<?php
/**
 * Player authentication API.
 */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

/**
 * Build a safe public player payload.
 *
 * @param array<string, mixed> $player
 * @return array<string, mixed>
 */
function pcw_public_player(array $player): array {
    return [
        'id' => (int)$player['id'],
        'name' => $player['name'],
        'ideology_id' => $player['ideology_id'] ?: null,
        'ideology_weights' => pcw_decode_ideology_weights($player['ideology_weights'] ?? null),
        'color' => $player['color'],
        'x' => (float)$player['x'],
        'y' => (float)$player['y'],
        'energy' => (int)$player['energy'],
    ];
}

try {
    $db = pcw_db();
    $body = pcw_read_json_body();
    $action = pcw_string($body['action'] ?? ($_GET['action'] ?? ''), '', 32);

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $action = pcw_string($_GET['action'] ?? 'me', 'me', 32);
        $token = pcw_string($_GET['token'] ?? '', '', 128);

        if ($action !== 'me') {
            pcw_json_response(['error' => 'Unsupported action.'], 400);
        }

        $player = pcw_find_player_by_token($db, $token);
        if (!$player) {
            pcw_json_response(['authenticated' => false]);
        }

        pcw_json_response([
            'authenticated' => true,
            'player' => pcw_public_player($player),
        ]);
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        pcw_json_response(['error' => 'Unsupported method.'], 405);
    }

    if ($action === 'register') {
        $name = pcw_string($body['name'] ?? '', '', 120);
        $password = (string)($body['password'] ?? '');

        if ($name === '') {
            throw new InvalidArgumentException('Le nom du joueur est obligatoire.');
        }
        if ((function_exists('mb_strlen') ? mb_strlen($password) : strlen($password)) < 4) {
            throw new InvalidArgumentException('Le mot de passe doit faire au moins 4 caractères.');
        }

        $stmt = $db->prepare('SELECT id FROM pcw_players WHERE name = :name LIMIT 1');
        $stmt->execute(['name' => $name]);
        if ($stmt->fetch()) {
            throw new InvalidArgumentException('Ce nom de joueur existe déjà.');
        }

        $token = pcw_create_auth_token();
        $stmt = $db->prepare('INSERT INTO pcw_players (name, password_hash, auth_token, color, x, y, energy, enabled) VALUES (:name, :password_hash, :auth_token, :color, 0, 0, 45, 1)');
        $stmt->execute([
            'name' => $name,
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'auth_token' => $token,
            'color' => pcw_string($body['color'] ?? '#ffffff', '#ffffff', 20),
        ]);

        $player = pcw_find_player_by_token($db, $token);
        pcw_json_response([
            'authenticated' => true,
            'token' => $token,
            'player' => pcw_public_player($player),
        ], 201);
    }

    if ($action === 'login') {
        $name = pcw_string($body['name'] ?? '', '', 120);
        $password = (string)($body['password'] ?? '');

        $stmt = $db->prepare('SELECT * FROM pcw_players WHERE name = :name AND enabled = 1 LIMIT 1');
        $stmt->execute(['name' => $name]);
        $player = $stmt->fetch();

        if (!$player || !password_verify($password, (string)($player['password_hash'] ?? ''))) {
            pcw_json_response(['error' => 'Identifiants invalides.'], 401);
        }

        $token = pcw_create_auth_token();
        $stmt = $db->prepare('UPDATE pcw_players SET auth_token = :auth_token, updated_at = NOW() WHERE id = :id');
        $stmt->execute([
            'auth_token' => $token,
            'id' => (int)$player['id'],
        ]);

        $player = pcw_find_player_by_token($db, $token);
        pcw_json_response([
            'authenticated' => true,
            'token' => $token,
            'player' => pcw_public_player($player),
        ]);
    }

    if ($action === 'logout') {
        $token = pcw_string($body['token'] ?? '', '', 128);
        if ($token !== '') {
            $stmt = $db->prepare('UPDATE pcw_players SET auth_token = NULL, updated_at = NOW() WHERE auth_token = :auth_token');
            $stmt->execute(['auth_token' => $token]);
        }
        pcw_json_response(['ok' => true]);
    }

    pcw_json_response(['error' => 'Unsupported action.'], 400);
} catch (Throwable $error) {
    pcw_json_response(['error' => $error->getMessage()], 500);
}
