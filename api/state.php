<?php
/**
 * Persistent shared game state endpoint.
 */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

/**
 * Convert a database player into the JS player shape.
 *
 * @param PDO $db
 * @param array<string, mixed> $player
 * @return array<string, mixed>
 */
function pcw_player_to_state(PDO $db, array $player): array {
    $ideology = null;
    if (!empty($player['ideology_id'])) {
        $stmt = $db->prepare('SELECT id, name, color, x, y, influence_power, attack_power, repair_power, regen, move_speed FROM pcw_ideologies WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $player['ideology_id']]);
        $ideology = $stmt->fetch() ?: null;
    }

    $playerclass = null;
    if (!empty($player['class_id'])) {
        $stmt = $db->prepare('SELECT id, name, slug, description, image_path, icon, action_name, action_slug, action_type, action_description, energy_cost, power, cooldown_seconds, preparation_seconds, required_supports, sort_order FROM pcw_player_classes WHERE id = :id AND enabled = 1 LIMIT 1');
        $stmt->execute(['id' => (int)$player['class_id']]);
        $playerclass = $stmt->fetch() ?: null;
    }

    return [
        'id' => 'player_' . (int)$player['id'],
        'dbId' => (int)$player['id'],
        'name' => $player['name'],
        'ideologyId' => $player['ideology_id'] ?: null,
        'ideologyName' => $ideology ? $ideology['name'] : 'Non choisi',
        'color' => $ideology ? $ideology['color'] : ($player['color'] ?: '#ffffff'),
        'x' => (float)$player['x'],
        'y' => (float)$player['y'],
        'market' => (float)$player['x'],
        'authority' => (float)$player['y'],
        'baseMarket' => $ideology ? (float)$ideology['x'] : (float)$player['x'],
        'baseAuthority' => $ideology ? (float)$ideology['y'] : (float)$player['y'],
        'energy' => (int)$player['energy'],
        'influencePower' => $ideology ? (int)$ideology['influence_power'] : 0,
        'attackPower' => $ideology ? (int)$ideology['attack_power'] : 0,
        'supportPower' => $ideology ? (int)$ideology['repair_power'] : 0,
        'regen' => $ideology ? (int)$ideology['regen'] : 0,
        'moveSpeed' => $ideology ? (float)$ideology['move_speed'] : 10,
        'classId' => $playerclass ? (int)$playerclass['id'] : null,
        'playerClass' => $playerclass ? [
            'id' => (int)$playerclass['id'],
            'name' => $playerclass['name'],
            'slug' => $playerclass['slug'],
            'description' => $playerclass['description'] ?: '',
            'imagePath' => $playerclass['image_path'] ?: '',
            'icon' => $playerclass['icon'] ?: '🎭',
            'actionName' => $playerclass['action_name'],
            'actionSlug' => $playerclass['action_slug'],
            'actionType' => $playerclass['action_type'],
            'actionDescription' => $playerclass['action_description'] ?: '',
            'energyCost' => (int)$playerclass['energy_cost'],
            'power' => (int)$playerclass['power'],
            'cooldownSeconds' => (int)$playerclass['cooldown_seconds'],
            'preparationSeconds' => (int)$playerclass['preparation_seconds'],
            'requiredSupports' => (int)$playerclass['required_supports'],
            'sortOrder' => (int)$playerclass['sort_order'],
        ] : null,
    ];
}

/**
 * Return all visible human players for map rendering.
 *
 * @param PDO $db
 * @return array<int, array<string, mixed>>
 */

/**
 * Advance the shared world clock on the server so every browser sees the same time.
 *
 * @param PDO $db
 * @param string $statekey
 * @param array<string, mixed> $state
 * @param string|null $updatedat
 * @return array<string, mixed>
 */
function pcw_advance_shared_time(PDO $db, string $statekey, array $state, ?string $updatedat): array {
    if ($updatedat === null || $updatedat === '') {
        return $state;
    }

    $last = strtotime($updatedat);
    if ($last === false) {
        return $state;
    }

    $elapsed = time() - $last;
    if ($elapsed <= 0) {
        return $state;
    }

    // Cap long idle periods to avoid a huge simulation jump after reopening the game.
    $elapsed = min($elapsed, 60);
    $state['time'] = (int)($state['time'] ?? 0) + $elapsed;

    // Strongholds do not regenerate their base ideology influence passively.
    // Influence changes only when accepted projectiles impact a fort.

    // Energy regeneration is persisted in pcw_players, not inside the shared world JSON.
    $stmt = $db->prepare(
        'UPDATE pcw_players p
           JOIN pcw_ideologies i ON i.id = p.ideology_id
            SET p.energy = LEAST(100, p.energy + (i.regen * :elapsed)),
                p.updated_at = NOW()
          WHERE p.enabled = 1'
    );
    $stmt->execute(['elapsed' => $elapsed]);

    $json = json_encode(pcw_world_state_only($state), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        throw new RuntimeException('Unable to encode advanced state.');
    }

    $stmt = $db->prepare('UPDATE pcw_game_states SET state_json = :statejson, updated_at = NOW() WHERE state_key = :statekey');
    $stmt->execute([
        'statejson' => $json,
        'statekey' => $statekey,
    ]);

    return $state;
}

function pcw_get_human_players(PDO $db): array {
    $players = $db->query('SELECT * FROM pcw_players WHERE enabled = 1 ORDER BY id ASC')->fetchAll();
    return array_map(static fn(array $player): array => pcw_player_to_state($db, $player), $players);
}

/**
 * Remove the browser-specific player data before storing the shared world.
 *
 * @param array<string, mixed> $state
 * @return array<string, mixed>
 */
function pcw_world_state_only(array $state): array {
    unset($state['player'], $state['humanPlayers'], $state['selectedFortId'], $state['notice']);
    $state['started'] = true;
    return $state;
}

/**
 * Persist the browser-specific current player fields.
 *
 * @param PDO $db
 * @param array<string, mixed> $playerrow
 * @param array<string, mixed> $stateplayer
 * @return void
 */
function pcw_update_current_player(PDO $db, array $playerrow, array $stateplayer): void {
    $requestedclassid = !empty($stateplayer['classId']) ? pcw_int($stateplayer['classId'], 0, 0, 100000) : null;
    $currentclassid = !empty($playerrow['class_id']) ? (int)$playerrow['class_id'] : null;
    $classid = $currentclassid;
    if ($currentclassid === null || $requestedclassid === null) {
        $classid = $requestedclassid;
    }

    $stmt = $db->prepare('UPDATE pcw_players SET ideology_id = :ideology_id, class_id = :class_id, color = :color, x = :x, y = :y, energy = :energy, updated_at = NOW() WHERE id = :id');
    $stmt->execute([
        'ideology_id' => pcw_string($stateplayer['ideologyId'] ?? '', '', 64) ?: null,
        'class_id' => $classid,
        'color' => pcw_string($stateplayer['color'] ?? '#ffffff', '#ffffff', 20),
        'x' => pcw_float($stateplayer['x'] ?? 0, 0, -100, 100),
        'y' => pcw_float($stateplayer['y'] ?? 0, 0, -100, 100),
        'energy' => pcw_int($stateplayer['energy'] ?? 45, 45, 0, 1000),
        'id' => (int)$playerrow['id'],
    ]);
}

try {
    $db = pcw_db();
    $statekey = pcw_string($_GET['key'] ?? 'default', 'default', 80);
    $token = pcw_string($_GET['token'] ?? '', '', 128);
    $playerrow = pcw_find_player_by_token($db, $token);

    if (!$playerrow) {
        pcw_json_response(['error' => 'Authentication required.'], 401);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $db->prepare('SELECT state_json, updated_at FROM pcw_game_states WHERE state_key = :statekey');
        $stmt->execute(['statekey' => $statekey]);
        $row = $stmt->fetch();
        $state = $row ? json_decode($row['state_json'], true) : null;

        if (!is_array($state)) {
            $state = null;
        }

        if ($state !== null) {
            $state = pcw_advance_shared_time($db, $statekey, $state, $row['updated_at'] ?? null);
            $playerrow = pcw_find_player_by_token($db, $token);
            if (!$playerrow) {
                pcw_json_response(['error' => 'Authentication required.'], 401);
            }
            $currentplayer = pcw_player_to_state($db, $playerrow);
            $state['player'] = $currentplayer;
            $state['humanPlayers'] = pcw_get_human_players($db);
            $state['selectedFortId'] = null;
            $state['notice'] = '';
            $state['started'] = !empty($currentplayer['ideologyId']);
        }

        pcw_json_response([
            'exists' => $state !== null,
            'state' => $state,
            'player' => pcw_player_to_state($db, $playerrow),
            'humanPlayers' => pcw_get_human_players($db),
        ]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $body = pcw_read_json_body();
        if (!isset($body['state']) || !is_array($body['state'])) {
            throw new InvalidArgumentException('Missing state payload.');
        }

        if (isset($body['state']['player']) && is_array($body['state']['player'])) {
            pcw_update_current_player($db, $playerrow, $body['state']['player']);
        }

        $worldstate = pcw_world_state_only($body['state']);
        $json = json_encode($worldstate, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            throw new RuntimeException('Unable to encode state.');
        }

        $stmt = $db->prepare('INSERT INTO pcw_game_states (state_key, state_json, updated_at) VALUES (:statekey, :statejson, NOW()) ON DUPLICATE KEY UPDATE state_json = VALUES(state_json), updated_at = NOW()');
        $stmt->execute([
            'statekey' => $statekey,
            'statejson' => $json,
        ]);
        pcw_json_response(['ok' => true]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $stmt = $db->prepare('DELETE FROM pcw_game_states WHERE state_key = :statekey');
        $stmt->execute(['statekey' => $statekey]);
        pcw_json_response(['ok' => true]);
    }

    pcw_json_response(['error' => 'Unsupported method.'], 405);
} catch (Throwable $error) {
    pcw_json_response(['error' => $error->getMessage()], 500);
}
