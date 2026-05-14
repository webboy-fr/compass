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
 * Return the full weighted influence payload for a player.
 *
 * One influence action sends every selected ideology score, for example
 * 5 liberal + 5 sovereignist, instead of only the dominant ideology.
 *
 * @param array<string, mixed> $player
 * @return array<string, int>
 */
function pcw_actions_get_influence_payload(array $player): array {
    $weights = pcw_decode_ideology_weights($player['ideology_weights'] ?? null);
    $payload = [];

    foreach ($weights as $ideologyid => $score) {
        $amount = max(0, (int)round((float)$score));
        if ($ideologyid !== '' && $amount > 0) {
            $payload[(string)$ideologyid] = $amount;
        }
    }

    if (empty($payload) && !empty($player['ideology_id'])) {
        $payload[(string)$player['ideology_id']] = 1;
    }

    return $payload;
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

function pcw_actions_validate_action_type(string $type): void {
    if (!in_array($type, ['influence', 'power_up', 'power_down'], true)) {
        throw new InvalidArgumentException('Invalid action type.');
    }
}

/**
 * Find a fort inside the state payload.
 *
 * @param array<string, mixed> $state
 * @param string $fortid
 * @return array<string, mixed>|null
 */
function pcw_actions_find_fort_index(array $state, string $fortid): ?int {
    if (empty($state['forts']) || !is_array($state['forts'])) {
        return null;
    }

    foreach ($state['forts'] as $index => $fort) {
        if (is_array($fort) && (string)($fort['id'] ?? '') === $fortid) {
            return (int)$index;
        }
    }

    return null;
}

/**
 * Apply a cumulative ideology point directly to a fort in the authoritative state.
 *
 * @param array<string, mixed> $fort
 * @param string $ideologyid
 * @param int $amount
 * @return array<string, mixed>
 */
function pcw_actions_apply_cumulative_point(array $fort, string $ideologyid, int $amount): array {
    if ($ideologyid === '' || $amount <= 0) {
        return $fort;
    }

    if (empty($fort['influence']) || !is_array($fort['influence'])) {
        $fort['influence'] = [];
    }

    $fort['influence'][$ideologyid] = (int)($fort['influence'][$ideologyid] ?? 0) + $amount;

    $leaderid = null;
    $leaderscore = 0;
    foreach ($fort['influence'] as $candidateid => $score) {
        $score = (int)$score;
        if ($score > $leaderscore) {
            $leaderid = (string)$candidateid;
            $leaderscore = $score;
        }
    }

    $fort['ownerIdeologyId'] = $leaderid;
    $fort['ownerActorId'] = null;

    return $fort;
}

/**
 * Apply a cumulative power point to a fort.
 *
 * @param array<string, mixed> $fort
 * @param string $type
 * @param int $amount
 * @return array<string, mixed>
 */
function pcw_actions_apply_power_point(array $fort, string $type, int $amount): array {
    if ($amount <= 0) {
        return $fort;
    }

    $positive = (int)($fort['positivePower'] ?? $fort['powerPositive'] ?? $fort['power'] ?? $fort['hp'] ?? 0);
    $negative = (int)($fort['negativePower'] ?? $fort['powerNegative'] ?? 0);

    if ($type === 'power_up') {
        $positive += $amount;
    } elseif ($type === 'power_down') {
        $negative += $amount;
    }

    $fort['positivePower'] = $positive;
    $fort['negativePower'] = $negative;
    $fort['power'] = $positive - $negative;

    return $fort;
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
    $influencepayload = pcw_actions_get_influence_payload($player);
    $playerclass = pcw_actions_get_player_class($db, $player);
    if ($ideology === null || empty($influencepayload)) {
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
    $nowms = pcw_utc_now_ms();

    foreach ($actions as $action) {
        if (!is_array($action)) {
            $rejected++;
            continue;
        }

        try {
            $type = pcw_string($action['type'] ?? '', '', 20);
            $isspecial = false;
            $actionslug = '';
            $fortid = pcw_string($action['fortId'] ?? '', '', 80);
            $fortindex = pcw_actions_find_fort_index($state, $fortid);
            if ($fortindex === null || empty($state['forts'][$fortindex]) || !is_array($state['forts'][$fortindex])) {
                $rejected++;
                continue;
            }
            $fort = $state['forts'][$fortindex];

            pcw_actions_validate_action_type($type);
            $amount = $type === 'influence' ? array_sum($influencepayload) : 1;
            $energycost = 1;

            if ($amount <= 0 || $energycost <= 0 || $energy < $energycost) {
                $rejected++;
                continue;
            }

            $energy -= $energycost;

            // The server is the source of truth for fort influence and power.
            // The projectile remains visual only, so another browser cannot apply the same point twice.
            if ($type === 'influence') {
                foreach ($influencepayload as $ideologyid => $influenceamount) {
                    $state['forts'][$fortindex] = pcw_actions_apply_cumulative_point($state['forts'][$fortindex], (string)$ideologyid, (int)$influenceamount);
                }
            } else {
                $state['forts'][$fortindex] = pcw_actions_apply_power_point($state['forts'][$fortindex], $type, $amount);
            }
            $fort = $state['forts'][$fortindex];

            $projectileid = pcw_string($action['id'] ?? '', '', 120);
            if ($projectileid === '') {
                $projectileid = 'projectile_' . pcw_utc_now_seconds() . '_' . bin2hex(random_bytes(4));
            }

            $alreadyqueued = false;
            foreach ($state['projectiles'] as $existingprojectile) {
                if (is_array($existingprojectile) && (string)($existingprojectile['id'] ?? '') === $projectileid) {
                    $alreadyqueued = true;
                    break;
                }
            }
            if ($alreadyqueued) {
                $accepted++;
                continue;
            }

            $state['projectiles'][] = [
                'id' => $projectileid,
                'actorId' => $actorid,
                'ideologyId' => (string)$ideology['id'],
                'ideologyWeights' => $influencepayload,
                'influencePayload' => $type === 'influence' ? $influencepayload : null,
                'fortId' => $fortid,
                'type' => $type,
                'amount' => $amount,
                'x' => $actorx,
                'y' => $actory,
                'targetX' => (float)($fort['x'] ?? 0),
                'targetY' => (float)($fort['y'] ?? 0),
                // Coordinates are now longitude/latitude degrees on Leaflet/OpenStreetMap.
                // A speed around one degree per second keeps projectiles visible across browsers.
                'speed' => random_int(85, 145) / 100,
                'createdAt' => $nowms,
                'updatedAt' => $nowms,
                'minTravelMs' => 900,
                'serverApplied' => true,
                'isSpecial' => false,
                'actionSlug' => null,
                'label' => null,
                'icon' => null,
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
    $stmt = $db->prepare('UPDATE pcw_players SET energy = :energy, updated_at = UTC_TIMESTAMP() WHERE id = :id');
    $stmt->execute([
        'energy' => $energy,
        'id' => (int)$player['id'],
    ]);

    $worldstate = pcw_attach_utc_clock(pcw_actions_world_state_only($state));
    $json = json_encode($worldstate, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        throw new RuntimeException('Unable to encode updated state.');
    }

    $stmt = $db->prepare('UPDATE pcw_game_states SET state_json = :statejson, updated_at = UTC_TIMESTAMP() WHERE state_key = :statekey');
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
