<?php
declare(strict_types=1);
require_once __DIR__ . '/_helpers.php';

try {
    $db = pcw_db();
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $action = pcw_string($_POST['action'] ?? '', '', 30);
        if ($action === 'delete') {
            $id = pcw_int($_POST['id'] ?? 0, 0, 0, PHP_INT_MAX);
            $stmt = $db->prepare('DELETE FROM pcw_forts WHERE id = :id');
            $stmt->execute(['id' => $id]);
            pcw_redirect('forts.php');
        }

        $id = pcw_int($_POST['id'] ?? 0, 0, 0, PHP_INT_MAX);
        $params = [
            'name' => pcw_string($_POST['name'] ?? '', 'Sans nom', 160),
            'x' => pcw_float($_POST['x'] ?? 0, 0, -100, 100),
            'y' => pcw_float($_POST['y'] ?? 0, 0, -100, 100),
            'base_ideology_id' => pcw_string($_POST['base_ideology_id'] ?? '', '', 64) ?: null,
            'hp' => pcw_int($_POST['hp'] ?? 100, 100, 1, 1000),
            'enabled' => pcw_checkbox('enabled'),
            'sort_order' => pcw_int($_POST['sort_order'] ?? 0, 0, -10000, 10000),
        ];

        if ($id > 0) {
            $params['id'] = $id;
            $stmt = $db->prepare('UPDATE pcw_forts SET name = :name, x = :x, y = :y, base_ideology_id = :base_ideology_id, hp = :hp, enabled = :enabled, sort_order = :sort_order WHERE id = :id');
        } else {
            $stmt = $db->prepare('INSERT INTO pcw_forts (name, x, y, base_ideology_id, hp, enabled, sort_order) VALUES (:name, :x, :y, :base_ideology_id, :hp, :enabled, :sort_order)');
        }
        $stmt->execute($params);
        pcw_redirect('forts.php');
    }

    $rows = $db->query('SELECT f.*, i.name AS ideology_name, i.color AS ideology_color FROM pcw_forts f LEFT JOIN pcw_ideologies i ON i.id = f.base_ideology_id ORDER BY f.sort_order, f.id')->fetchAll();
    pcw_admin_header('Forces / forts');
    echo '<section class="card"><h2>Ajouter / modifier</h2><form method="post" class="grid"><label>ID à modifier<input name="id" type="number" placeholder="laisser vide pour créer"></label><label>Nom<input name="name" required></label><label>X<input name="x" type="number" min="-100" max="100" step="1" value="0"></label><label>Y<input name="y" type="number" min="-100" max="100" step="1" value="0"></label><label>Base idéologique<select name="base_ideology_id">';
    pcw_render_ideology_options(null, true);
    echo '</select></label><label>PV<input name="hp" type="number" value="100"></label><label>Ordre<input name="sort_order" type="number" value="0"></label><label><span>Actif</span><input name="enabled" type="checkbox" checked></label><div><button class="button" type="submit">Enregistrer</button></div></form></section>';
    echo '<section class="card"><h2>Liste</h2><table><thead><tr><th>ID</th><th>Nom</th><th>Position</th><th>Base</th><th>PV</th><th>Actif</th><th></th></tr></thead><tbody>';
    foreach ($rows as $row) {
        $base = $row['ideology_name'] ? '<span class="color-dot" style="background:' . pcw_h($row['ideology_color']) . '"></span>' . pcw_h($row['ideology_name']) : 'Neutre';
        echo '<tr><td>' . pcw_h($row['id']) . '</td><td>' . pcw_h($row['name']) . '</td><td>' . pcw_h($row['x']) . ' / ' . pcw_h($row['y']) . '</td><td>' . $base . '</td><td>' . pcw_h($row['hp']) . '</td><td>' . ($row['enabled'] ? 'oui' : 'non') . '</td><td><form method="post" class="inline-actions"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="' . pcw_h($row['id']) . '"><button class="button danger" type="submit">Supprimer</button></form></td></tr>';
    }
    echo '</tbody></table><p class="small">Pour modifier : recopie l’ID dans le formulaire. Après modification des forts de départ, réinitialise l’état de partie pour régénérer la carte.</p></section>';
    pcw_admin_footer();
} catch (Throwable $error) {
    pcw_admin_header('Forces / forts');
    echo '<div class="error">Erreur : ' . pcw_h($error->getMessage()) . '</div>';
    pcw_admin_footer();
}
