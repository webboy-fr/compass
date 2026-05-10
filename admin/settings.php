<?php
/**
 * Sensitivity and gameplay settings.
 */
declare(strict_types=1);
require_once __DIR__ . '/_helpers.php';

try {
    $db = pcw_db();

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $actiondebouncems = pcw_int($_POST['action_debounce_ms'] ?? 50, 50, 0, 1000);
        $stmt = $db->prepare(
            'INSERT INTO pcw_settings (setting_key, setting_value, label, description)
             VALUES (:setting_key, :setting_value, :label, :description)
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), label = VALUES(label), description = VALUES(description)'
        );
        $stmt->execute([
            'setting_key' => 'action_debounce_ms',
            'setting_value' => (string)$actiondebouncems,
            'label' => 'Debounce des actions (ms)',
            'description' => 'Fenêtre pendant laquelle les clics rapides gardent la priorité visuelle sur la régénération/synchronisation serveur.',
        ]);
        pcw_redirect('settings.php?saved=1');
    }

    $settings = [];
    $rows = $db->query('SELECT setting_key, setting_value FROM pcw_settings')->fetchAll();
    foreach ($rows as $row) {
        $settings[(string)$row['setting_key']] = (string)$row['setting_value'];
    }

    pcw_admin_header('Sensibilité / réglages');
    if (isset($_GET['saved'])) {
        echo '<div class="success">Réglages enregistrés.</div>';
    }
    echo '<section class="card"><h2>Actions</h2>';
    echo '<form method="post" class="grid">';
    echo '<label>Debounce des actions (ms)<input name="action_debounce_ms" type="number" min="0" max="1000" step="1" value="' . pcw_h($settings['action_debounce_ms'] ?? '50') . '"></label>';
    echo '<div><button class="button" type="submit">Enregistrer</button></div>';
    echo '</form>';
    echo '<p class="small">Valeur conseillée : 50 ms. Pendant cette fenêtre, les clics rapides ont priorité sur la régénération affichée, pour garder l’effet mitraillette.</p>';
    echo '</section>';
    pcw_admin_footer();
} catch (Throwable $error) {
    pcw_admin_header('Sensibilité / réglages');
    echo '<div class="error">Erreur : ' . pcw_h($error->getMessage()) . '</div>';
    pcw_admin_footer();
}
