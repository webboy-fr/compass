<?php

declare(strict_types=1);

require_once __DIR__ . '/../config.php';

try {
    $pdo = new PDO(
        'mysql:host=' . $config['db_host'] . ';dbname=' . $config['db_name'] . ';charset=utf8mb4',
        $config['db_user'],
        $config['db_pass'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]
    );

    $migrationspath = __DIR__ . '/../sql/migrations';
    $files = glob($migrationspath . '/*.sql');

    if ($files === false) {
        throw new RuntimeException('Unable to read migrations directory.');
    }

    sort($files);

    $pdo->exec(
        'CREATE TABLE IF NOT EXISTS pcw_migrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            migration VARCHAR(255) NOT NULL UNIQUE,
            applied_at DATETIME NOT NULL
        )'
    );

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

        $pdo->exec($sql);

        $insert = $pdo->prepare(
            'INSERT INTO pcw_migrations (migration, applied_at)
             VALUES (:migration, NOW())'
        );

        $insert->execute([
            'migration' => $migration,
        ]);

        echo '[ OK ] ' . $migration . PHP_EOL;
    }

    echo PHP_EOL . 'Database is up to date.' . PHP_EOL;

} catch (Throwable $exception) {
    echo '[ERROR] ' . $exception->getMessage() . PHP_EOL;
    exit(1);
}
