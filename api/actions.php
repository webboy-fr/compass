<?php
/**
 * Batched fire-and-forget action endpoint.
 */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

/**
 * Keep only the shared world fields before storing the state JSON.
 *
 * @param array<string, mixed> $state
 * @return array<string, mixed>
 */
function pcw_actions_world_state_only(array $state): array {
    unset($state['player'], $state['humanPlayers'], $state['selectedFortId'], $state['notice']);
    $state['started'] = true;
    return $state;
}

/**
 * Read the current player ideology powers.
 *
 * @param PDO $db
 * @param array<string, mixed> $player
 * @return array<string, mixed>|null
 */
function pcw_actions_get_ideology(PDO $db, array $player): ?array {
    if (empty($player['ideology_id'])) {
        return null;
    }

    $stmt = $db->prepare('SELECT id, x, y, color, influence_power, attack_power, repair_power FROM pcw_ideologies WHERE id = :id AND enabled = 1 LIMIT 1');
    $stmt->execute(['id' => $player['ideology_id']]);
    $ideology = $stmt->fetch();

    return is_array($ideology) ? $ideology : null;
}

/**
 * Return the configured power for an action type.
 *
 * @param array<string, mixed> $ideology
 * @param string $type
 * @return int
 */
function pcw_actions_get_player_class(PDO $db, array $player): ?array {
    if (empty($player['class_id'])) {
        return null;
    }

    $stmt = $db->prepare('SELECT id, action_slug, action_type, action_name, icon, energy_cost, power FROM pcw_player_classes WHERE id = :id AND enabled = 1 LIMIT 1');
    $stmt->execute(['id' => (int)$player['class_id']]);
    $class = $stmt->fetch();

    return is_array($class) ? $class : null;
}

function pcw_actions_get_power(array $ideology, string $type): int {
    if ($type === 'influence') {
        return (int)$ideology['influence_power'];
    }
    if ($type === 'attack') {
        return (int)$ideology['attack_power'];
    }
    if ($type === 'support') {
        return (int)$ideology['repair_power'];
    }

    throw new InvalidArgumentException('Invalid action type.');
}

/**
 * Find a fort inside the state payload.
 *
 * @param array<string, mixed> $state
 * @param string $fortid
 * @return array<string, mixed>|null
 */
function pcw_actions_find_fort(array $state, string $fortid): ?array {
    if (empty($state['forts']) || !is_array($state['forts'])) {
        return null;
    }

    foreach ($state['forts'] as $fort) {
        if (is_array($fort) && (string)($fort['id'] ?? '') === $fortid) {
            return $fort;
        }
    }

    return null;
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        pcw_json_response(['error' => 'Unsupported method.'], 405);
    }

    $db = pcw_db();
    $statekey = pcw_string($_GET['key'] ?? 'default', 'default', 80);
    $token = pcw_string($_GET['token'] ?? '', '', 128);
    $player = pcw_find_player_by_token($db, $token);

    if (!$player) {
        pcw_json_response(['error' => 'Authentication required.'], 401);
    }

    $body = pcw_read_json_body();
    $actions = $body['actions'] ?? [];
    if (!is_array($actions)) {
        throw new InvalidArgumentException('Actions payload must be an array.');
    }

    $actions = array_slice($actions, 0, 50);
    $ideology = pcw_actions_get_ideology($db, $player);
    $playerclass = pcw_actions_get_player_class($db, $player);
    if ($ideology === null) {
        pcw_json_response(['ok' => true, 'accepted' => 0, 'rejected' => count($actions), 'energy' => (int)$player['energy']]);
    }

    $stmt = $db->prepare('SELECT state_json FROM pcw_game_states WHERE state_key = :statekey LIMIT 1');
    $stmt->execute(['statekey' => $statekey]);
    $row = $stmt->fetch();
    $state = $row ? json_decode((string)$row['state_json'], true) : null;

    if (!is_array($state)) {
        pcw_json_response(['ok' => false, 'error' => 'Shared state is not initialized.'], 409);
    }

    if (!isset($state['projectiles']) || !is_array($state['projectiles'])) {
        $state['projectiles'] = [];
    }

    $accepted = 0;
    $rejected = 0;
    $energy = (int)$player['energy'];
    $actorid = 'player_' . (int)$player['id'];
    $actorx = (float)$player['x'];
    $actory = (float)$player['y'];

    foreach ($actions as $action) {
        if (!is_array($action)) {
            $rejected++;
            continue;
        }

        try {
            $type = pcw_string($action['type'] ?? '', '', 20);
            $isspecial = !empty($action['isSpecial']);
            $actionslug = pcw_string($action['actionSlug'] ?? '', '', 80);
            $fortid = pcw_string($action['fortId'] ?? '', '', 80);
            $fort = pcw_actions_find_fort($state, $fortid);
            if ($fort === null) {
                $rejected++;
                continue;
            }

            if ($isspecial) {
                if ($playerclass === null || $actionslug === '' || $actionslug !== (string)$playerclass['action_slug']) {
                    $rejected++;
                    continue;
                }
                $type = (string)$playerclass['action_type'];
                $amount = (int)$playerclass['power'];
                $energycost = (int)$playerclass['energy_cost'];
            } else {
                $amount = pcw_actions_get_power($ideology, $type);
                $energycost = $amount;
            }

            if ($amount <= 0 || $energycost <= 0 || $energy < $energycost) {
                $rejected++;
                continue;
            }

            $energy -= $energycost;
            $projectileid = pcw_string($action['id'] ?? '', '', 120);
            if ($projectileid === '') {
                $projectileid = 'projectile_' . time() . '_' . bin2hex(random_bytes(4));
            }

            $state['projectiles'][] = [
                'id' => $projectileid,
                'actorId' => $actorid,
                'ideologyId' => (string)$ideology['id'],
                'fortId' => $fortid,
                'type' => $type,
                'amount' => $amount,
                'x' => $actorx,
                'y' => $actory,
                'targetX' => (float)($fort['x'] ?? 0),
                'targetY' => (float)($fort['y'] ?? 0),
                'speed' => random_int(115, 170),
                'isSpecial' => $isspecial,
                'actionSlug' => $isspecial ? $actionslug : null,
                'label' => $isspecial && $playerclass ? (string)$playerclass['action_name'] : null,
                'icon' => $isspecial && $playerclass ? (string)$playerclass['icon'] : null,
            ];
            $accepted++;
        } catch (Throwable $ignored) {
            $rejected++;
        }
    }

    // Avoid unbounded growth if somebody really hammers the button.
    if (count($state['projectiles']) > 500) {
        $state['projectiles'] = array_slice($state['projectiles'], -500);
    }

    $db->beginTransaction();
    $stmt = $db->prepare('UPDATE pcw_players SET energy = :energy, updated_at = NOW() WHERE id = :id');
    $stmt->execute([
        'energy' => $energy,
        'id' => (int)$player['id'],
    ]);

    $worldstate = pcw_actions_world_state_only($state);
    $json = json_encode($worldstate, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        throw new RuntimeException('Unable to encode updated state.');
    }

    $stmt = $db->prepare('UPDATE pcw_game_states SET state_json = :statejson, updated_at = NOW() WHERE state_key = :statekey');
    $stmt->execute([
        'statejson' => $json,
        'statekey' => $statekey,
    ]);
    $db->commit();

    pcw_json_response([
        'ok' => true,
        'accepted' => $accepted,
        'rejected' => $rejected,
        'energy' => $energy,
    ]);
} catch (Throwable $error) {
    if (isset($db) && $db instanceof PDO && $db->inTransaction()) {
        $db->rollBack();
    }
    pcw_json_response(['error' => $error->getMessage()], 500);
}
