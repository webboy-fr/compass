<?php
/**
 * Shared admin helpers.
 */
declare(strict_types=1);

require_once dirname(__DIR__) . '/api/bootstrap.php';

/**
 * Render the admin page header.
 *
 * @param string $title
 * @return void
 */
function pcw_admin_header(string $title): void {
    echo '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>' . htmlspecialchars($title) . ' - Compass Admin</title><link rel="stylesheet" href="admin.css"></head><body><div class="admin-shell">';
    echo '<header class="admin-header"><div><h1>' . htmlspecialchars($title) . '</h1><p>Mini-backoffice Compass War</p></div><a class="button" href="../index.html">↩ Jeu</a></header>';
    echo '<nav class="nav"><a href="index.php">Dashboard</a><a href="ideologies.php">Idéologies</a><a href="forts.php">Forces / forts</a><a href="players.php">Joueurs</a><a href="classes.php">Classes</a><a href="settings.php">Sensibilité / réglages</a><a href="state.php">État de partie</a></nav>';
}

/**
 * Render the admin page footer.
 *
 * @return void
 */
function pcw_admin_footer(): void {
    echo '</div></body></html>';
}

/**
 * Return escaped HTML.
 *
 * @param mixed $value
 * @return string
 */
function pcw_h(mixed $value): string {
    return htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
}

/**
 * Redirect to an admin path.
 *
 * @param string $path
 * @return void
 */
function pcw_redirect(string $path): void {
    header('Location: ' . $path);
    exit;
}

/**
 * Read a POST checkbox as boolean integer.
 *
 * @param string $name
 * @return int
 */
function pcw_checkbox(string $name): int {
    return isset($_POST[$name]) ? 1 : 0;
}

/**
 * Fetch active ideologies for select fields.
 *
 * @return array<int, array<string, mixed>>
 */
function pcw_admin_ideologies(): array {
    return pcw_db()->query('SELECT id, name, color FROM pcw_ideologies ORDER BY sort_order, name')->fetchAll();
}

/**
 * Render ideology select options.
 *
 * @param string|null $selected
 * @param bool $allowempty
 * @return void
 */
function pcw_render_ideology_options(?string $selected, bool $allowempty = true): void {
    if ($allowempty) {
        echo '<option value="">Aucune</option>';
    }
    foreach (pcw_admin_ideologies() as $ideology) {
        $isSelected = ((string)$selected === (string)$ideology['id']) ? ' selected' : '';
        echo '<option value="' . pcw_h($ideology['id']) . '"' . $isSelected . '>' . pcw_h($ideology['name']) . '</option>';
    }
}
