# Compass War — persistance PHP/MySQL

## Ce qui a été ajouté

- `api/config.php` : charge les idéologies, forces/forts depuis la base.
- `api/state.php` : sauvegarde/charge l’état courant de la partie.
- `api/players.php` et `api/forts.php` : endpoints JSON minimaux pour créer/lister ces entités.
- `admin/` : mini-backoffice pour gérer les idéologies, forces/forts, joueurs et la sauvegarde serveur.
- `sql/schema.sql` : structure MySQL/MariaDB.
- `sql/seed.sql` : données équivalentes à la config actuelle.

## Installation rapide

1. Créer une base MySQL/MariaDB.
2. Importer `sql/schema.sql`.
3. Importer `sql/seed.sql`.
4. Copier `config.example.php` vers `config.php`.
5. Modifier `config.php` avec les identifiants de l’hébergeur.
6. Ouvrir `admin/index.php` pour vérifier que la connexion DB fonctionne.
7. Ouvrir `index.html` pour jouer.

## Comportement du front

Le front change très peu :

- il tente de charger la config serveur via `api/config.php` ;
- il tente de charger/sauvegarder l’état serveur via `api/state.php` ;
- si l’API ou la base ne répond pas, il continue avec la config JS et le `localStorage`.

## Important

Après avoir modifié les forts dans le backoffice, il faut réinitialiser l’état de partie dans `admin/state.php` ou via le bouton “Réinitialiser” dans le jeu. Sinon la carte continue à afficher la sauvegarde existante.

## Sécurité

Ce backoffice est volontairement minimal pour le prototype. Pour une mise en ligne publique, il faudra ajouter au minimum :

- une authentification admin ;
- une protection CSRF sur les formulaires ;
- des droits par rôle ;
- une validation plus stricte des couleurs/identifiants ;
- éventuellement un mode lecture seule pour certaines pages.

## Mise à jour : login / création de joueur

Cette version ajoute une vraie identité de joueur côté navigateur :

- au premier accès, le jeu affiche un écran de connexion ;
- le joueur peut créer un compte directement depuis la page du jeu ;
- chaque navigateur garde son propre token de session dans `localStorage` ;
- l'état de carte reste partagé, mais `player` est maintenant le joueur connecté du navigateur courant ;
- les autres joueurs humains connectés sont affichés sur la carte avec leur nom.

### Base déjà installée avec l'ancienne version

Si tu avais déjà importé la première version du schéma, exécute aussi :

```sql
-- À adapter si une colonne existe déjà chez toi.
ALTER TABLE pcw_players ADD COLUMN password_hash VARCHAR(255) NULL AFTER ideology_id;
ALTER TABLE pcw_players ADD COLUMN auth_token VARCHAR(128) NULL AFTER password_hash;
ALTER TABLE pcw_players ADD UNIQUE KEY pcw_players_name_uk (name);
ALTER TABLE pcw_players ADD UNIQUE KEY pcw_players_auth_token_uk (auth_token);
```

Le même contenu est disponible dans `sql/upgrade_auth.sql`.

### Base neuve

Si tu repars de zéro, importe simplement :

1. `sql/schema.sql`
2. `sql/seed.sql`

Puis ouvre `index.html`. Le jeu demandera de créer ou connecter un joueur.

## Mise à jour : synchronisation live

Cette version corrige la synchronisation entre plusieurs navigateurs connectés sur la même partie :

- le front relit l'état partagé toutes les 500 ms ;
- les changements de PV, d'influence et de propriétaire sont réinjectés dans le DOM sans F5 ;
- les mouvements de projectiles ne sont plus sauvegardés à chaque frame, afin d'éviter que chaque navigateur écrase l'état commun plusieurs dizaines de fois par seconde ;
- l'état partagé est sauvegardé quand un joueur déclenche une action et quand un projectile touche réellement sa cible ;
- le tick passif local continue d'animer l'écran, mais ne réécrit plus l'état partagé en base à chaque seconde.

Pour tester : connecter Julien dans un navigateur, Léo dans un autre, attaquer ou influencer un fort côté Julien, puis vérifier côté Léo sans rafraîchir la page.

## Réglage du debounce des actions

Le backoffice contient maintenant une page `admin/settings.php` nommée **Sensibilité / réglages**.

Réglage disponible :

- `action_debounce_ms` : fenêtre en millisecondes pendant laquelle les clics rapides gardent la priorité visuelle sur la régénération/synchronisation serveur. Valeur par défaut : `50`.

Pour une installation neuve, importer simplement `sql/schema.sql` puis `sql/seed.sql`.

## V11 classes de joueurs

Cette version ajoute une table `pcw_player_classes`, un champ `pcw_players.class_id`, une page backoffice `admin/classes.php` et une modale front `Profil joueur`.

Pour une installation existante, importer :

```sql
SOURCE sql/upgrade_player_classes.sql;
```

Pour une installation neuve, importer simplement `sql/schema.sql` puis `sql/seed.sql` : les classes par défaut sont déjà incluses.

Les trois classes préconfigurées sont :

- Journaliste → Article d’enquête → attaque.
- Influenceur → Vidéo virale → influence.
- Expert → Plateau télé → soutien.

Le libellé joueur `Réparation` est remplacé par `Soutien`; le nom SQL `repair_power` reste conservé pour compatibilité de migration.


## V12 — Classes verrouillées et actions spéciales préparées

- Une classe choisie est verrouillée côté interface et côté serveur.
- Le joueur peut réinitialiser sa classe depuis la modale joueur.
- Une action spéciale n'est plus lancée instantanément : elle crée une préparation visible par les autres joueurs.
- Les autres joueurs peuvent soutenir cette préparation depuis le panneau d'information de la place forte.
- Les réglages `required_supports` et `preparation_seconds` sont stockés en base et configurables en backoffice.
- Les boutons d'action affichent des tooltips détaillés avec coût, puissance et effet.
- Les actions spéciales affichent un état visuel : attente, prêt, chargement.
