<?php
declare(strict_types=1);
require_once __DIR__ . '/_helpers.php';

try {
    $db = pcw_db();
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $action = pcw_string($_POST['action'] ?? '', '', 30);
        if ($action === 'delete') {
            $id = pcw_int($_POST['id'] ?? 0, 0, 0, PHP_INT_MAX);
            $stmt = $db->prepare('DELETE FROM pcw_players WHERE id = :id');
            $stmt->execute(['id' => $id]);
            pcw_redirect('players.php');
        }
        $id = pcw_int($_POST['id'] ?? 0, 0, 0, PHP_INT_MAX);
        $params = [
            'name' => pcw_string($_POST['name'] ?? '', 'Joueur', 120),
            'ideology_id' => pcw_string($_POST['ideology_id'] ?? '', '', 64) ?: null,
            'class_id' => pcw_int($_POST['class_id'] ?? 0, 0, 0, PHP_INT_MAX) ?: null,
            'color' => pcw_string($_POST['color'] ?? '#ffffff', '#ffffff', 20),
            'x' => pcw_float($_POST['x'] ?? 0, 0, -100, 100),
            'y' => pcw_float($_POST['y'] ?? 0, 0, -100, 100),
            'energy' => pcw_int($_POST['energy'] ?? 45, 45, 0, 1000),
            'enabled' => pcw_checkbox('enabled'),
        ];
        if ($id > 0) {
            $params['id'] = $id;
            $stmt = $db->prepare('UPDATE pcw_players SET name = :name, ideology_id = :ideology_id, class_id = :class_id, color = :color, x = :x, y = :y, energy = :energy, enabled = :enabled WHERE id = :id');
        } else {
            $stmt = $db->prepare('INSERT INTO pcw_players (name, ideology_id, class_id, color, x, y, energy, enabled) VALUES (:name, :ideology_id, :class_id, :color, :x, :y, :energy, :enabled)');
        }
        $stmt->execute($params);
        pcw_redirect('players.php');
    }

    $rows = $db->query('SELECT p.*, i.name AS ideology_name, i.color AS ideology_color, c.name AS class_name, c.icon AS class_icon FROM pcw_players p LEFT JOIN pcw_ideologies i ON i.id = p.ideology_id LEFT JOIN pcw_player_classes c ON c.id = p.class_id ORDER BY p.id DESC')->fetchAll();
    pcw_admin_header('Joueurs');
    echo '<section class="card"><h2>Ajouter / modifier</h2><form method="post" class="grid"><label>ID à modifier<input name="id" type="number" placeholder="laisser vide pour créer"></label><label>Nom<input name="name" required></label><label>Idéologie<select name="ideology_id">';
    pcw_render_ideology_options(null, true);
    echo '</select></label><label>Classe<select name="class_id"><option value="">Aucune</option>';
    foreach ($db->query('SELECT id, name, icon FROM pcw_player_classes ORDER BY sort_order, name')->fetchAll() as $classrow) {
        echo '<option value="' . pcw_h($classrow['id']) . '">' . pcw_h($classrow['icon']) . ' ' . pcw_h($classrow['name']) . '</option>';
    }
    echo '</select></label><label>Couleur<input name="color" type="color" value="#ffffff"></label><label>X<input name="x" type="number" min="-100" max="100" step="1" value="0"></label><label>Y<input name="y" type="number" min="-100" max="100" step="1" value="0"></label><label>Énergie<input name="energy" type="number" value="45"></label><label><span>Actif</span><input name="enabled" type="checkbox" checked></label><div><button class="button" type="submit">Enregistrer</button></div></form></section>';
    echo '<section class="card"><h2>Liste</h2><table><thead><tr><th>ID</th><th>Nom</th><th>Idéologie</th><th>Classe</th><th>Position</th><th>Énergie</th><th>Actif</th><th></th></tr></thead><tbody>';
    foreach ($rows as $row) {
        $ideology = $row['ideology_name'] ? '<span class="color-dot" style="background:' . pcw_h($row['ideology_color']) . '"></span>' . pcw_h($row['ideology_name']) : 'Aucune';
        echo '<tr><td>' . pcw_h($row['id']) . '</td><td><span class="color-dot" style="background:' . pcw_h($row['color']) . '"></span>' . pcw_h($row['name']) . '</td><td>' . $ideology . '</td><td>' . ($row['class_name'] ? pcw_h(($row['class_icon'] ?: '🎭') . ' ' . $row['class_name']) : 'Aucune') . '</td><td>' . pcw_h($row['x']) . ' / ' . pcw_h($row['y']) . '</td><td>' . pcw_h($row['energy']) . '</td><td>' . ($row['enabled'] ? 'oui' : 'non') . '</td><td><form method="post" class="inline-actions"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="' . pcw_h($row['id']) . '"><button class="button danger" type="submit">Supprimer</button></form></td></tr>';
    }
    echo '</tbody></table><p class="small">Cette table prépare le vrai multi-joueur. Pour l’instant, le front continue à utiliser le joueur local “TOI”.</p></section>';
    pcw_admin_footer();
} catch (Throwable $error) {
    pcw_admin_header('Joueurs');
    echo '<div class="error">Erreur : ' . pcw_h($error->getMessage()) . '</div>';
    pcw_admin_footer();
}
