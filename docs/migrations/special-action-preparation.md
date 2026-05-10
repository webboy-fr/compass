# Migration — Préparation des actions spéciales

Fichier SQL : `sql/upgrade_special_preparation.sql`

Ajouts dans `pcw_player_classes` :

- `preparation_seconds INT NOT NULL DEFAULT 2`
- `required_supports INT NOT NULL DEFAULT 1`

Les trois classes par défaut sont configurées avec :

- 1 soutien requis
- 2 secondes de chargement

Ces valeurs sont modifiables dans le backoffice `admin/classes.php`.
