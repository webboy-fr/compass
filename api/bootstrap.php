<?php
/**
 * Shared API/bootstrap helpers for Compass War.
 */
declare(strict_types=1);

$configfile = __DIR__ . '/config.local.php';
if (!file_exists($configfile)) {
    throw new RuntimeException('Missing API configuration file: api/config.local.php');
}

$dbconfig = require $configfile;

/**
 * Return a PDO connection configured for safe default usage.
 *
 * @return PDO
 */
function pcw_db(): PDO {
    static $pdo = null;
    global $dbconfig;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = sprintf(
        'mysql:host=%s;dbname=%s;charset=%s',
        $dbconfig['dbhost'],
        $dbconfig['dbname'],
        $dbconfig['charset'] ?? 'utf8mb4'
    );

    $pdo = new PDO($dsn, $dbconfig['dbuser'], $dbconfig['dbpass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}

/**
 * Send a JSON response and stop the current request.
 *
 * @param mixed $payload
 * @param int $status
 * @return void
 */
function pcw_json_response(mixed $payload, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
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

    return mb_substr($stringvalue, 0, $maxlength);
}


/**
 * Create a browser session token for a player.
 *
 * @return string
 */
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
function pcw_find_player_by_token(PDO $db, string $token): ?array {
    if ($token === '') {
        return null;
    }

    $stmt = $db->prepare('SELECT * FROM pcw_players WHERE auth_token = :auth_token AND enabled = 1 LIMIT 1');
    $stmt->execute(['auth_token' => $token]);
    $player = $stmt->fetch();

    return is_array($player) ? $player : null;
}
