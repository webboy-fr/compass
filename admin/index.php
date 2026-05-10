<?php
declare(strict_types=1);
require_once __DIR__ . '/_helpers.php';

try {
    $db = pcw_db();
    $counts = [
        'Idéologies' => (int)$db->query('SELECT COUNT(*) FROM pcw_ideologies')->fetchColumn(),
        'Forces / forts' => (int)$db->query('SELECT COUNT(*) FROM pcw_forts')->fetchColumn(),
        'Joueurs' => (int)$db->query('SELECT COUNT(*) FROM pcw_players')->fetchColumn(),
        'Classes' => (int)$db->query('SELECT COUNT(*) FROM pcw_player_classes')->fetchColumn(),
        'Réglages' => (int)$db->query('SELECT COUNT(*) FROM pcw_settings')->fetchColumn(),
    ];
    $state = $db->query("SELECT updated_at FROM pcw_game_states WHERE state_key = 'default'")->fetch();
    pcw_admin_header('Dashboard');
    echo '<section class="card"><h2>État du prototype</h2><div class="grid">';
    foreach ($counts as $label => $count) {
        echo '<div><strong style="font-size:32px">' . pcw_h($count) . '</strong><div class="small">' . pcw_h($label) . '</div></div>';
    }
    echo '</div></section>';
    echo '<section class="card"><h2>Persistance</h2><p>Le front charge la configuration depuis <code>api/config.php</code> et sauvegarde l’état courant dans <code>api/state.php</code>. En cas d’erreur API, il retombe sur le localStorage.</p>';
    echo '<p class="small">Dernière sauvegarde serveur : ' . pcw_h($state['updated_at'] ?? 'aucune') . '</p></section>';
    echo '<section class="card"><h2>Installation</h2><ol><li>Créer une base MySQL/MariaDB.</li><li>Importer <code>sql/schema.sql</code>.</li><li>Importer <code>sql/seed.sql</code>.</li><li>Vérifier <code>api/config.local.php</code> et renseigner les identifiants DB si besoin.</li></ol></section>';
    pcw_admin_footer();
} catch (Throwable $error) {
    pcw_admin_header('Dashboard');
    echo '<div class="error">Erreur : ' . pcw_h($error->getMessage()) . '</div>';
    pcw_admin_footer();
}
