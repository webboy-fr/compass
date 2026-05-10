<?php
declare(strict_types=1);
require_once __DIR__ . '/_helpers.php';

try {
    $db = pcw_db();
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $action = pcw_string($_POST['action'] ?? '', '', 30);
        if ($action === 'reset') {
            $db->prepare('DELETE FROM pcw_game_states WHERE state_key = :statekey')->execute(['statekey' => 'default']);
            pcw_redirect('state.php');
        }
    }

    $row = $db->query("SELECT state_key, state_json, updated_at FROM pcw_game_states WHERE state_key = 'default'")->fetch();
    pcw_admin_header('État de partie');
    echo '<section class="card"><h2>Sauvegarde serveur</h2>';
    if ($row) {
        echo '<p>Dernière sauvegarde : <strong>' . pcw_h($row['updated_at']) . '</strong></p>';
        echo '<form method="post"><input type="hidden" name="action" value="reset"><button class="button danger" type="submit">Réinitialiser la sauvegarde serveur</button></form>';
        echo '<h3>JSON actuel</h3><pre style="white-space:pre-wrap;max-height:420px;overflow:auto;background:rgba(0,0,0,.25);padding:12px;border-radius:12px">' . pcw_h(json_encode(json_decode($row['state_json'], true), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) . '</pre>';
    } else {
        echo '<p>Aucun état serveur pour le moment. Le jeu créera une sauvegarde au premier lancement.</p>';
    }
    echo '</section>';
    pcw_admin_footer();
} catch (Throwable $error) {
    pcw_admin_header('État de partie');
    echo '<div class="error">Erreur : ' . pcw_h($error->getMessage()) . '</div>';
    pcw_admin_footer();
}
