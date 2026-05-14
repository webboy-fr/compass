<?php
/**
 * Shared API/bootstrap helpers for Compass War.
 */
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');

// All gameplay timings and database timestamps use UTC.
date_default_timezone_set('UTC');

/**
 * Send a JSON response and stop the current request.
 *
 * @param mixed $payload
 * @param int $status
 * @return void
 */
function pcw_json_response(mixed $payload, int $status = 200): void {
    http_response_code($status);
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

set_exception_handler(static function (Throwable $exception): void {
    pcw_json_response([
        'error' => $exception->getMessage(),
    ], 500);
});

register_shutdown_function(static function (): void {
    $error = error_get_last();
    if ($error === null) {
        return;
    }

    $fataltypes = [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR];
    if (!in_array((int)$error['type'], $fataltypes, true)) {
        return;
    }

    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }

    echo json_encode([
        'error' => 'Fatal PHP error: ' . ($error['message'] ?? 'unknown error'),
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
});

/**
 * Load the root application configuration.
 *
 * Supports the recommended format:
 * return ['db_host' => 'localhost', ...];
 *
 * Also supports the older format:
 * $config = ['db_host' => 'localhost', ...];
 *
 * @param string $configfile
 * @return array<string, mixed>
 */
function pcw_load_root_config(string $configfile): array {
    if (!file_exists($configfile)) {
        throw new RuntimeException('Missing root configuration file: config.php. Copy config.example.php to config.php and edit database values.');
    }

    $loader = static function (string $file): array {
        $config = null;
        $returned = require $file;

        if (is_array($returned)) {
            return $returned;
        }

        if (is_array($config)) {
            return $config;
        }

        throw new RuntimeException('config.php must return a configuration array. Expected: return [\'db_host\' => ..., \'db_name\' => ..., \'db_user\' => ..., \'db_pass\' => ...];');
    };

    $loadedconfig = $loader($configfile);

    foreach (['db_host', 'db_name', 'db_user', 'db_pass'] as $key) {
        if (!array_key_exists($key, $loadedconfig) || $loadedconfig[$key] === '') {
            throw new RuntimeException('Missing database config key: ' . $key);
        }
    }

    return $loadedconfig;
}

$config = pcw_load_root_config(dirname(__DIR__) . '/config.php');

/**
 * Return a PDO connection configured for safe default usage.
 *
 * @return PDO
 */
function pcw_db(): PDO {
    static $pdo = null;
    global $config;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $charset = $config['db_charset'] ?? 'utf8mb4';
    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        $config['db_host'],
        $config['db_name'],
        $charset
    );

    $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    // Force the MySQL session to UTC so UTC_TIMESTAMP()/CURRENT_TIMESTAMP never depends on the server timezone.
    $pdo->exec("SET time_zone = '+00:00'");

    return $pdo;
}


/**
 * Return the current UTC timestamp in milliseconds.
 *
 * @return int
 */
function pcw_utc_now_ms(): int {
    return (int)floor(microtime(true) * 1000);
}

/**
 * Return the current UTC timestamp in seconds.
 *
 * @return int
 */
function pcw_utc_now_seconds(): int {
    return intdiv(pcw_utc_now_ms(), 1000);
}

/**
 * Return an UTC datetime formatted for MySQL DATETIME columns.
 *
 * @return string
 */
function pcw_utc_datetime(): string {
    return gmdate('Y-m-d H:i:s');
}

/**
 * Convert a database datetime, treated as UTC, into an epoch timestamp.
 *
 * @param string|null $datetime
 * @return int|null
 */
function pcw_parse_utc_datetime(?string $datetime): ?int {
    if ($datetime === null || trim($datetime) === '') {
        return null;
    }

    try {
        $date = new DateTimeImmutable($datetime, new DateTimeZone('UTC'));
        return $date->getTimestamp();
    } catch (Throwable) {
        return null;
    }
}

/**
 * Attach the authoritative UTC clock to a shared state payload.
 *
 * @param array<string, mixed> $state
 * @return array<string, mixed>
 */
function pcw_attach_utc_clock(array $state): array {
    $nowms = pcw_utc_now_ms();
    $state['time'] = intdiv($nowms, 1000);
    $state['utcTimeMs'] = $nowms;
    $state['utcIso'] = gmdate('Y-m-d\TH:i:s\Z', intdiv($nowms, 1000));
    return $state;
}

/**
 * Read and decode a JSON request body.
 *
 * @return array<string, mixed>
 */
function pcw_read_json_body(): array {
    $rawbody = file_get_contents('php://input');
    if ($rawbody === false || trim($rawbody) === '') {
        return [];
    }

    $data = json_decode($rawbody, true);
    if (!is_array($data)) {
        throw new InvalidArgumentException('Invalid JSON body.');
    }

    return $data;
}

/**
 * Convert an arbitrary value to a bounded integer.
 *
 * @param mixed $value
 * @param int $default
 * @param int $min
 * @param int $max
 * @return int
 */
function pcw_int(mixed $value, int $default, int $min, int $max): int {
    if ($value === null || $value === '') {
        return $default;
    }

    $intvalue = filter_var($value, FILTER_VALIDATE_INT);
    if ($intvalue === false) {
        throw new InvalidArgumentException('Invalid integer value.');
    }

    return max($min, min($max, $intvalue));
}

/**
 * Convert an arbitrary value to a bounded float.
 *
 * @param mixed $value
 * @param float $default
 * @param float $min
 * @param float $max
 * @return float
 */
function pcw_float(mixed $value, float $default, float $min, float $max): float {
    if ($value === null || $value === '') {
        return $default;
    }

    if (!is_numeric($value)) {
        throw new InvalidArgumentException('Invalid numeric value.');
    }

    $floatvalue = (float)$value;
    return max($min, min($max, $floatvalue));
}

/**
 * Read a string request value.
 *
 * @param mixed $value
 * @param string $default
 * @param int $maxlength
 * @return string
 */
function pcw_string(mixed $value, string $default = '', int $maxlength = 255): string {
    $stringvalue = trim((string)($value ?? $default));
    if ($stringvalue === '') {
        return $default;
    }

    return function_exists('mb_substr') ? mb_substr($stringvalue, 0, $maxlength) : substr($stringvalue, 0, $maxlength);
}

/**
 * Create a browser session token for a player.
 *
 * @return string
 */

/**
 * Decode saved ideology point distribution.
 *
 * @param mixed $value
 * @return array<string, int>
 */
function pcw_decode_ideology_weights(mixed $value): array {
    if (!is_string($value) || trim($value) === '') {
        return [];
    }

    $decoded = json_decode($value, true);
    if (!is_array($decoded)) {
        return [];
    }

    $weights = [];
    foreach ($decoded as $ideologyid => $score) {
        $id = pcw_string($ideologyid, '', 64);
        if ($id === '') {
            continue;
        }
        $weights[$id] = max(0, min(10, (int)$score));
    }

    return $weights;
}

/**
 * Validate and encode an ideology point distribution.
 *
 * @param mixed $value
 * @return string|null
 */
function pcw_encode_ideology_weights(mixed $value): ?string {
    if (!is_array($value)) {
        return null;
    }

    $weights = [];
    $total = 0;
    foreach ($value as $ideologyid => $score) {
        $id = pcw_string($ideologyid, '', 64);
        if ($id === '') {
            continue;
        }
        $points = max(0, min(10, (int)$score));
        if ($points <= 0) {
            continue;
        }
        $weights[$id] = $points;
        $total += $points;
    }

    if ($total > 10) {
        throw new InvalidArgumentException('La répartition idéologique ne peut pas dépasser 10 points.');
    }

    $json = json_encode($weights, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        throw new RuntimeException('Unable to encode ideology weights.');
    }

    return $json;
}

function pcw_create_auth_token(): string {
    return bin2hex(random_bytes(32));
}

/**
 * Find an enabled player from its browser token.
 *
 * @param PDO $db
 * @param string $token
 * @return array<string, mixed>|null
 */


/**
 * Return the visible player coordinates from the stored movement timeline.
 *
 * The database stores x/y as the final destination so the movement is durable,
 * while these helper values let every browser render the same smooth transition
 * from UTC time.
 *
 * @param array<string, mixed> $player
 * @param int|null $nowms
 * @return array<string, mixed>
 */
function pcw_player_movement_view(array $player, ?int $nowms = null): array {
    $nowms = $nowms ?? pcw_utc_now_ms();
    $targetx = (float)($player['x'] ?? 2.3522);
    $targety = (float)($player['y'] ?? 48.8566);

    $fromx = isset($player['movement_from_x']) && $player['movement_from_x'] !== null ? (float)$player['movement_from_x'] : $targetx;
    $fromy = isset($player['movement_from_y']) && $player['movement_from_y'] !== null ? (float)$player['movement_from_y'] : $targety;
    $tox = isset($player['movement_to_x']) && $player['movement_to_x'] !== null ? (float)$player['movement_to_x'] : $targetx;
    $toy = isset($player['movement_to_y']) && $player['movement_to_y'] !== null ? (float)$player['movement_to_y'] : $targety;
    $startedms = isset($player['movement_started_at_ms']) && $player['movement_started_at_ms'] !== null ? (int)$player['movement_started_at_ms'] : 0;
    $durationms = isset($player['movement_duration_ms']) && $player['movement_duration_ms'] !== null ? max(0, (int)$player['movement_duration_ms']) : 0;

    if ($startedms <= 0 || $durationms <= 0 || $nowms >= $startedms + $durationms) {
        return [
            'x' => $targetx,
            'y' => $targety,
            'targetX' => $targetx,
            'targetY' => $targety,
            'moving' => false,
            'elapsedMs' => $durationms,
            'durationMs' => $durationms,
        ];
    }

    $progress = max(0.0, min(1.0, ($nowms - $startedms) / $durationms));
    $eased = $progress * $progress * (3 - (2 * $progress));

    return [
        'x' => $fromx + (($tox - $fromx) * $eased),
        'y' => $fromy + (($toy - $fromy) * $eased),
        'targetX' => $tox,
        'targetY' => $toy,
        'moving' => true,
        'elapsedMs' => max(0, $nowms - $startedms),
        'durationMs' => $durationms,
        'startedAtMs' => $startedms,
    ];
}

/**
 * Compute a movement duration in milliseconds for longitude/latitude coordinates.
 *
 * @param float $fromx
 * @param float $fromy
 * @param float $tox
 * @param float $toy
 * @param float $movespeed
 * @return int
 */
function pcw_compute_player_movement_duration_ms(float $fromx, float $fromy, float $tox, float $toy, float $movespeed): int {
    $distance = sqrt((($tox - $fromx) ** 2) + (($toy - $fromy) ** 2));
    $speed = max(1.0, $movespeed);
    $cruiseunitspersecond = $speed * 0.18;
    $duration = max(0.32, ($distance / $cruiseunitspersecond) + 0.16);

    return (int)round($duration * 1000);
}

function pcw_find_player_by_token(PDO $db, string $token): ?array {
    if ($token === '') {
        return null;
    }

    $stmt = $db->prepare('SELECT * FROM pcw_players WHERE auth_token = :auth_token AND enabled = 1 LIMIT 1');
    $stmt->execute(['auth_token' => $token]);
    $player = $stmt->fetch();

    return is_array($player) ? $player : null;
}
