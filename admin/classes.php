<?php
/**
 * Player class backoffice.
 */
declare(strict_types=1);

require_once __DIR__ . '/_helpers.php';

try {
    $db = pcw_db();

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $action = pcw_string($_POST['action'] ?? 'save', 'save', 20);
        if ($action === 'delete') {
            $stmt = $db->prepare('DELETE FROM pcw_player_classes WHERE id = :id');
            $stmt->execute(['id' => pcw_int($_POST['id'] ?? 0, 0, 1, 100000)]);
        } else {
            $stmt = $db->prepare('INSERT INTO pcw_player_classes (id, name, slug, description, image_path, icon, action_name, action_slug, action_type, action_description, energy_cost, power, cooldown_seconds, preparation_seconds, required_supports, enabled, sort_order) VALUES (:id, :name, :slug, :description, :image_path, :icon, :action_name, :action_slug, :action_type, :action_description, :energy_cost, :power, :cooldown_seconds, :preparation_seconds, :required_supports, :enabled, :sort_order) ON DUPLICATE KEY UPDATE name = VALUES(name), slug = VALUES(slug), description = VALUES(description), image_path = VALUES(image_path), icon = VALUES(icon), action_name = VALUES(action_name), action_slug = VALUES(action_slug), action_type = VALUES(action_type), action_description = VALUES(action_description), energy_cost = VALUES(energy_cost), power = VALUES(power), cooldown_seconds = VALUES(cooldown_seconds), preparation_seconds = VALUES(preparation_seconds), required_supports = VALUES(required_supports), enabled = VALUES(enabled), sort_order = VALUES(sort_order)');
            $id = pcw_int($_POST['id'] ?? 0, 0, 0, 100000);
            $actiontype = pcw_string($_POST['action_type'] ?? 'influence', 'influence', 20);
            if (!in_array($actiontype, ['attack', 'influence', 'support'], true)) {
                $actiontype = 'influence';
            }
            $stmt->execute([
                'id' => $id > 0 ? $id : null,
                'name' => pcw_string($_POST['name'] ?? '', '', 120),
                'slug' => pcw_string($_POST['slug'] ?? '', '', 80),
                'description' => pcw_string($_POST['description'] ?? '', '', 2000),
                'image_path' => pcw_string($_POST['image_path'] ?? '', '', 255),
                'icon' => pcw_string($_POST['icon'] ?? '🎭', '🎭', 20),
                'action_name' => pcw_string($_POST['action_name'] ?? '', '', 120),
                'action_slug' => pcw_string($_POST['action_slug'] ?? '', '', 80),
                'action_type' => $actiontype,
                'action_description' => pcw_string($_POST['action_description'] ?? '', '', 2000),
                'energy_cost' => pcw_int($_POST['energy_cost'] ?? 10, 10, 0, 1000),
                'power' => pcw_int($_POST['power'] ?? 10, 10, 0, 1000),
                'cooldown_seconds' => pcw_int($_POST['cooldown_seconds'] ?? 0, 0, 0, 3600),
                'preparation_seconds' => pcw_int($_POST['preparation_seconds'] ?? 2, 2, 0, 3600),
                'required_supports' => pcw_int($_POST['required_supports'] ?? 1, 1, 0, 20),
                'enabled' => isset($_POST['enabled']) ? 1 : 0,
                'sort_order' => pcw_int($_POST['sort_order'] ?? 0, 0, -1000, 1000),
            ]);
        }
    }

    pcw_admin_header('Classes de joueurs');
    echo '<section class="card"><h2>Ajouter / modifier</h2><form method="post" class="grid">';
    echo '<label>ID existant, optionnel<input name="id" type="number" min="0" placeholder="laisser vide pour créer"></label>';
    echo '<label>Nom<input name="name" required placeholder="Journaliste"></label>';
    echo '<label>Slug<input name="slug" required placeholder="journalist"></label>';
    echo '<label>Icône<input name="icon" value="🎭"></label>';
    echo '<label>Image<input name="image_path" placeholder="assets/classes/journalist.svg"></label>';
    echo '<label>Action spéciale<input name="action_name" required placeholder="Article d’enquête"></label>';
    echo '<label>Slug action<input name="action_slug" required placeholder="investigation_article"></label>';
    echo '<label>Type action<select name="action_type"><option value="attack">Attaque</option><option value="influence">Influence</option><option value="support">Soutien</option></select></label>';
    echo '<label>Coût énergie<input name="energy_cost" type="number" value="10"></label>';
    echo '<label>Puissance<input name="power" type="number" value="10"></label>';
    echo '<label>Cooldown secondes<input name="cooldown_seconds" type="number" value="0"></label>';
    echo '<label>Chargement secondes<input name="preparation_seconds" type="number" value="2"></label>';
    echo '<label>Soutiens requis<input name="required_supports" type="number" value="1"></label>';
    echo '<label>Ordre<input name="sort_order" type="number" value="0"></label>';
    echo '<label>Description<textarea name="description" rows="3"></textarea></label>';
    echo '<label>Description action<textarea name="action_description" rows="3"></textarea></label>';
    echo '<label><span>Actif</span><input name="enabled" type="checkbox" checked></label>';
    echo '<div><button class="button" type="submit">Enregistrer</button></div></form></section>';

    $rows = $db->query('SELECT * FROM pcw_player_classes ORDER BY sort_order, id')->fetchAll();
    echo '<section class="card"><h2>Classes configurées</h2><table><tr><th>ID</th><th>Classe</th><th>Action</th><th>Équilibrage</th><th>Actif</th><th></th></tr>';
    foreach ($rows as $row) {
        echo '<tr><td>' . pcw_h($row['id']) . '</td><td>' . pcw_h($row['icon']) . ' <strong>' . pcw_h($row['name']) . '</strong><br><small>' . pcw_h($row['slug']) . '</small></td><td>' . pcw_h($row['action_name']) . '<br><small>' . pcw_h($row['action_type']) . '</small></td><td>coût ' . pcw_h($row['energy_cost']) . ' · puissance ' . pcw_h($row['power']) . '<br><small>soutiens ' . pcw_h($row['required_supports'] ?? 1) . ' · chargement ' . pcw_h($row['preparation_seconds'] ?? 2) . 's</small></td><td>' . ($row['enabled'] ? 'oui' : 'non') . '</td><td><form method="post" class="inline-actions"><input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="' . pcw_h($row['id']) . '"><button class="button danger" type="submit">Supprimer</button></form></td></tr>';
    }
    echo '</table></section>';
    pcw_admin_footer();
} catch (Throwable $error) {
    pcw_admin_error($error);
}
