<?php
/**
 * Completely reinstalls the Compass War database.
 *
 * This script drops every table matching the pcw_% prefix, recreates the schema,
 * applies SQL migrations from sql/migrations in alphabetical order, then imports seeds.
 *
 * Usage:
 *   php tools/reinstall_database.php --yes
 *   php tools/reinstall_database.php --yes --skip-seed
 */

declare(strict_types=1);

$configpath = __DIR__ . '/../config.php';
$rootpath = dirname(__DIR__);

try {
    $options = getopt('', ['yes', 'force', 'skip-seed']);

    if ($options === false) {
        throw new RuntimeException('Unable to read command line options.');
    }

    $confirmed = array_key_exists('yes', $options) || array_key_exists('force', $options);
    $skipseed = array_key_exists('skip-seed', $options);

    if (!$confirmed) {
        throw new RuntimeException(
            'This script permanently drops all pcw_% tables. Re-run with --yes to confirm.'
        );
    }

    if (!file_exists($configpath)) {
        throw new RuntimeException('Missing config.php. Create config.php with your database settings first.');
    }

    $config = load_config($configpath);

    foreach (['db_host', 'db_name', 'db_user', 'db_pass'] as $key) {
        if (!array_key_exists($key, $config) || $config[$key] === '') {
            throw new RuntimeException('Missing database config key: ' . $key);
        }
    }

    $pdo = new PDO(
        'mysql:host=' . $config['db_host'] . ';dbname=' . $config['db_name'] . ';charset=' . ($config['db_charset'] ?? 'utf8mb4'),
        $config['db_user'],
        $config['db_pass'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );

    echo 'Reinstalling database: ' . $config['db_name'] . PHP_EOL;
    echo 'Using config: ' . realpath($configpath) . PHP_EOL . PHP_EOL;

    drop_prefixed_tables($pdo, 'pcw_');

    run_sql_file($pdo, $rootpath . '/sql/schema.sql', 'schema.sql');

    apply_migrations($pdo, $rootpath . '/sql/migrations');

    if ($skipseed) {
        echo '[SKIP] seed.sql' . PHP_EOL;
    } else {
        run_sql_file($pdo, $rootpath . '/sql/seed.sql', 'seed.sql');
    }

    echo PHP_EOL . 'Database reinstall completed.' . PHP_EOL;
    exit(0);
} catch (Throwable $exception) {
    echo '[ERROR] ' . $exception->getMessage() . PHP_EOL;
    exit(1);
}

/**
 * Loads the project configuration file.
 *
 * @param string $file Absolute path to config.php.
 * @return array<string, mixed>
 */
function load_config(string $file): array
{
    $config = null;
    $returned = require $file;

    if (is_array($returned)) {
        return $returned;
    }

    if (is_array($config)) {
        return $config;
    }

    throw new RuntimeException('config.php must return a configuration array.');
}

/**
 * Drops every table using the expected project prefix.
 *
 * @param PDO $pdo Database connection.
 * @param string $prefix Table prefix to drop.
 * @return void
 */
function drop_prefixed_tables(PDO $pdo, string $prefix): void
{
    if ($prefix === '') {
        throw new InvalidArgumentException('Table prefix cannot be empty.');
    }

    $statement = $pdo->prepare('SHOW TABLES LIKE :pattern');
    $statement->execute([
        'pattern' => str_replace(['_', '%'], ['\\_', '\\%'], $prefix) . '%',
    ]);

    $tables = $statement->fetchAll(PDO::FETCH_COLUMN);

    if (empty($tables)) {
        echo 'No ' . $prefix . '% table to drop.' . PHP_EOL;
        return;
    }

    echo 'Dropping ' . count($tables) . ' table(s).' . PHP_EOL;

    $pdo->exec('SET FOREIGN_KEY_CHECKS=0');

    try {
        foreach ($tables as $table) {
            $tablename = (string) $table;

            if (!str_starts_with($tablename, $prefix)) {
                throw new RuntimeException('Unexpected table outside prefix: ' . $tablename);
            }

            echo '[DROP] ' . $tablename . PHP_EOL;
            $pdo->exec('DROP TABLE IF EXISTS `' . str_replace('`', '``', $tablename) . '`');
        }
    } finally {
        $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
    }
}

/**
 * Runs a SQL file with PDO.
 *
 * @param PDO $pdo Database connection.
 * @param string $file Absolute SQL file path.
 * @param string $label Human readable label.
 * @return void
 */
function run_sql_file(PDO $pdo, string $file, string $label): void
{
    if (!file_exists($file)) {
        throw new RuntimeException('Missing SQL file: ' . $file);
    }

    $sql = file_get_contents($file);

    if ($sql === false) {
        throw new RuntimeException('Unable to read SQL file: ' . $file);
    }

    echo '[RUN ] ' . $label . PHP_EOL;
    $pdo->exec($sql);
    echo '[ OK ] ' . $label . PHP_EOL;
}

/**
 * Applies migrations in alphabetical order and records them in pcw_migrations.
 *
 * @param PDO $pdo Database connection.
 * @param string $migrationspath Absolute migrations directory path.
 * @return void
 */
function apply_migrations(PDO $pdo, string $migrationspath): void
{
    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS pcw_migrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            migration VARCHAR(255) NOT NULL UNIQUE,
            applied_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    if (!is_dir($migrationspath)) {
        echo 'No migrations directory found.' . PHP_EOL;
        return;
    }

    $files = glob($migrationspath . '/*.sql');

    if ($files === false) {
        throw new RuntimeException('Unable to read migrations directory.');
    }

    sort($files);

    if (count($files) === 0) {
        echo 'No migration file found.' . PHP_EOL;
        return;
    }

    foreach ($files as $file) {
        $migration = basename($file);

        run_sql_file($pdo, $file, 'migration ' . $migration);

        $insert = $pdo->prepare(
            'INSERT INTO pcw_migrations (migration, applied_at)
             VALUES (:migration, NOW())
             ON DUPLICATE KEY UPDATE applied_at = VALUES(applied_at)'
        );

        $insert->execute([
            'migration' => $migration,
        ]);
    }
}
