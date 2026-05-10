<?php

declare(strict_types=1);

$configpath = __DIR__ . '/../config.php';

try {
    if (!file_exists($configpath)) {
        throw new RuntimeException('Missing config.php. Copy config.example.php to config.php and edit database values.');
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

    $config = $loader($configpath);

    foreach (['db_host', 'db_name', 'db_user', 'db_pass'] as $key) {
        if (!array_key_exists($key, $config) || $config[$key] === '') {
            throw new RuntimeException('Missing database config key: ' . $key);
        }
    }

    echo 'Using config: ' . realpath($configpath) . PHP_EOL;
    echo 'Database: ' . $config['db_name'] . PHP_EOL;
    echo 'User: ' . $config['db_user'] . PHP_EOL . PHP_EOL;

    $pdo = new PDO(
        'mysql:host=' . $config['db_host'] . ';dbname=' . $config['db_name'] . ';charset=' . ($config['db_charset'] ?? 'utf8mb4'),
        $config['db_user'],
        $config['db_pass'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS pcw_migrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            migration VARCHAR(255) NOT NULL UNIQUE,
            applied_at DATETIME NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );

    $migrationspath = __DIR__ . '/../sql/migrations';
    $files = glob($migrationspath . '/*.sql');

    if ($files === false) {
        throw new RuntimeException('Unable to read migrations directory.');
    }

    sort($files);

    if (count($files) === 0) {
        echo 'No migration file found.' . PHP_EOL;
        exit(0);
    }

    $statement = $pdo->query('SELECT migration FROM pcw_migrations');

    if ($statement === false) {
        throw new RuntimeException('Unable to fetch applied migrations.');
    }

    $applied = $statement->fetchAll(PDO::FETCH_COLUMN);

    foreach ($files as $file) {
        $migration = basename($file);

        if (in_array($migration, $applied, true)) {
            echo '[SKIP] ' . $migration . PHP_EOL;
            continue;
        }

        echo '[RUN ] ' . $migration . PHP_EOL;

        $sql = file_get_contents($file);

        if ($sql === false) {
            throw new RuntimeException('Unable to read migration file: ' . $migration);
        }

        try {
            // DDL statements such as CREATE TABLE can implicitly commit in MySQL.
            // We intentionally run migrations without wrapping them in a PHP transaction.
            $pdo->exec($sql);

            $insert = $pdo->prepare(
                'INSERT INTO pcw_migrations (migration, applied_at)
                 VALUES (:migration, NOW())'
            );

            $insert->execute([
                'migration' => $migration,
            ]);
        } catch (Throwable $exception) {
            throw new RuntimeException(
                'Migration failed: ' . $migration . ' - ' . $exception->getMessage(),
                0,
                $exception
            );
        }

        echo '[ OK ] ' . $migration . PHP_EOL;
    }

    echo PHP_EOL . 'Database is up to date.' . PHP_EOL;
} catch (Throwable $exception) {
    echo '[ERROR] ' . $exception->getMessage() . PHP_EOL;
    exit(1);
}
