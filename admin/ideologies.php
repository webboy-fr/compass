<?php
declare(strict_types=1);
require_once __DIR__ . '/_helpers.php';

try {
    $db = pcw_db();

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $action = pcw_string($_POST['action'] ?? '', '', 30);
        if ($action === 'delete') {
            $id = pcw_string($_POST['id'] ?? '', '', 64);
            $stmt = $db->prepare('DELETE FROM pcw_ideologies WHERE id = :id');
            $stmt->execute(['id' => $id]);
            pcw_redirect('ideologies.php');
        }

        $id = strtolower(preg_replace('/[^a-z0-9_-]+/', '', pcw_string($_POST['id'] ?? '', '', 64)) ?? '');
        if ($id === '') {
            throw new InvalidArgumentException('L’identifiant est obligatoire.');
        }

        $stmt = $db->prepare('INSERT INTO pcw_ideologies (id, name, color, x, y, influence_power, attack_power, repair_power, regen, move_speed, enabled, sort_order) VALUES (:id, :name, :color, :x, :y, :influence_power, :attack_power, :repair_power, :regen, :enabled, :sort_order) ON DUPLICATE KEY UPDATE name = VALUES(name), color = VALUES(color), x = VALUES(x), y = VALUES(y), influence_power = VALUES(influence_power), attack_power = VALUES(attack_power), repair_power = VALUES(repair_power), regen = VALUES(regen), move_speed = VALUES(move_speed), enabled = VALUES(enabled), sort_order = VALUES(sort_order)');
        $stmt->execute([
            'id' => $id,
            'name' => pcw_string($_POST['name'] ?? '', 'Sans nom', 120),
            'color' => pcw_string($_POST['color'] ?? '#ffffff', '#ffffff', 20),
            'x' => pcw_float($_POST['x'] ?? 0, 0, -100, 100),
            'y' => pcw_float($_POST['y'] ?? 0, 0, -100, 100),
            'influence_power' => pcw_int($_POST['influence_power'] ?? 10, 10, 0, 100),
            'attack_power' => pcw_int($_POST['attack_power'] ?? 10, 10, 0, 100),
            'repair_power' => pcw_int($_POST['repair_power'] ?? 10, 10, 0, 100),
            'regen' => pcw_int($_POST['regen'] ?? 6, 6, 0, 100),
            'move_speed' => pcw_float($_POST['move_speed'] ?? 10, 10, 1, 100),
            'enabled' => pcw_checkbox('enabled'),
            'sort_order' => pcw_int($_POST['sort_order'] ?? 0, 0, -10000, 10000),
        ]);
        pcw_redirect('ideologies.php');
    }

    $rows = $db->query('SELECT * FROM pcw_ideologies ORDER BY sort_order, name')->fetchAll();
    pcw_admin_header('Idéologies');
    echo '<section class="card"><h2>Ajouter / modifier</h2><form method="post" class="grid"><label>ID technique<input name="id" placeholder="liberal"></label><label>Nom<input name="name" required></label><label>Couleur<input name="color" type="color" value="#42d392"></label><label>X marché/état<input name="x" type="number" min="-100" max="100" step="1" value="0"></label><label>Y liberté/autorité<input name="y" type="number" min="-100" max="100" step="1" value="0"></label><label>Influence<input name="influence_power" type="number" value="10"></label><label>Attaque<input name="attack_power" type="number" value="10"></label><label>Soutien<input name="repair_power" type="number" value="10"></label><label>Regen<input name="regen" type="number" value="6"></label><label>Vitesse déplacement<input name="move_speed" type="number" step="0.5" value="10"></label><label>Ordre<input name="sort_order" type="number" value="0"></label><label><span>Actif</span><input name="enabled" type="checkbox" checked></label><div><button class="button" type="submit">Enregistrer</button></div></form></section>';
    echo '<section class="card"><h2>Liste</h2><table><thead><tr><th>ID</th><th>Nom</th><th>Position</th><th>Forces</th><th>Actif</th><th></th></tr></thead><tbody>';
    foreach ($rows as $row) {
        echo '<tr><td>' . pcw_h($row['id']) . '</td><td><span class="color-dot" style="background:' . pcw_h($row['color']) . '"></span>' . pcw_h($row['name']) . '</td><td>' . pcw_h($row['x']) . ' / ' . pcw_h($row['y']) . '</td><td>I ' . pcw_h($row['influence_power']) . ' · A ' . pcw_h($row['attack_power']) . ' · S ' . pcw_h($row['repair_power']) . ' · +' . pcw_h($row['regen']) . ' · V ' . pcw_h($row['move_speed'] ?? 10) . '</td><td>' . ($row['enabled'] ? 'oui' : 'non') . '</td><td><form method="post" class="inline-actions"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="' . pcw_h($row['id']) . '"><button class="button danger" type="submit">Supprimer</button></form></td></tr>';
    }
    echo '</tbody></table><p class="small">Pour modifier : ressaisis le même ID technique dans le formulaire.</p></section>';
    pcw_admin_footer();
} catch (Throwable $error) {
    pcw_admin_header('Idéologies');
    echo '<div class="error">Erreur : ' . pcw_h($error->getMessage()) . '</div>';
    pcw_admin_footer();
}
