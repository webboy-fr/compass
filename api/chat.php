<?php
/**
 * Minimal shared chat API.
 */
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

/**
 * Fetch the last chat messages in chronological order.
 *
 * @param PDO $db
 * @return array<int, array<string, mixed>>
 */
function pcw_chat_messages(PDO $db): array {
    $stmt = $db->query(
        'SELECT id, player_id, player_name, message, created_at
           FROM pcw_chat_messages
       ORDER BY id DESC
          LIMIT 20'
    );

    $messages = array_reverse($stmt->fetchAll());

    return array_map(static function (array $message): array {
        return [
            'id' => (int)$message['id'],
            'playerId' => (int)$message['player_id'],
            'playerName' => (string)$message['player_name'],
            'message' => (string)$message['message'],
            'createdAt' => (string)$message['created_at'],
        ];
    }, $messages);
}

/**
 * Keep only the last messages to avoid unbounded growth in this prototype.
 *
 * @param PDO $db
 * @return void
 */
function pcw_prune_chat_messages(PDO $db): void {
    $db->exec(
        'DELETE FROM pcw_chat_messages
          WHERE id NOT IN (
                SELECT id FROM (
                    SELECT id FROM pcw_chat_messages ORDER BY id DESC LIMIT 20
                ) latest_messages
          )'
    );
}

try {
    $db = pcw_db();
    $token = pcw_string($_GET['token'] ?? '', '', 128);
    $playerrow = pcw_find_player_by_token($db, $token);

    if (!$playerrow) {
        pcw_json_response(['error' => 'Authentication required.'], 401);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        pcw_json_response(['messages' => pcw_chat_messages($db)]);
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $body = pcw_read_json_body();
        $message = pcw_string($body['message'] ?? '', '', 200);

        if ($message === '') {
            throw new InvalidArgumentException('Empty chat message.');
        }

        $stmt = $db->prepare(
            'INSERT INTO pcw_chat_messages (player_id, player_name, message, created_at)
                  VALUES (:player_id, :player_name, :message, NOW())'
        );
        $stmt->execute([
            'player_id' => (int)$playerrow['id'],
            'player_name' => pcw_string($playerrow['name'] ?? 'Joueur', 'Joueur', 120),
            'message' => $message,
        ]);

        pcw_prune_chat_messages($db);
        pcw_json_response(['ok' => true, 'messages' => pcw_chat_messages($db)]);
    }

    pcw_json_response(['error' => 'Method not allowed.'], 405);
} catch (Throwable $error) {
    pcw_json_response(['error' => $error->getMessage()], 500);
}
