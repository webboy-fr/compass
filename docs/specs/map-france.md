# Carte de France SVG

La carte centrale n’est plus un repère idéologique à axes marché/État et libertés/autorité. Elle affiche une carte SVG vectorielle de France métropolitaine, placée dans `assets/maps/france.svg`.

## Rendu

La carte utilise un `viewBox` large `1600 × 1000`, proche du ratio de la zone centrale. Le SVG est rempli à 100 % par le conteneur de jeu afin que les calques de bastions, joueurs et projectiles restent alignés sur le même repère.

Le dessin contient :

- un contour métropolitain plus reconnaissable ;
- des séparateurs régionaux très discrets ;
- la Corse ;
- aucun libellé permanent pour éviter la surcharge visuelle.

## Coordonnées

Les coordonnées des bastions et des joueurs sont normalisées en pourcentage du repère SVG affiché :

- `x = 0` : bord gauche ;
- `x = 100` : bord droit ;
- `y = 0` : haut ;
- `y = 100` : bas.

Ce choix permet de réutiliser les anciens champs `x` et `y` sans refonte lourde du modèle.

## Zoom et déplacement

Le zoom est appliqué au calque vectoriel complet `#mapWorld` : SVG, bastions, joueurs et projectiles. La carte reste donc nette à fort zoom.

Le zoom est borné de `1×` à `8×`. Le déplacement est borné pour éviter de perdre totalement la carte hors de l’écran.

## Bastions par défaut

Les bastions initiaux sont placés géographiquement : Élysée, Assemblée nationale, mairies de Paris, Marseille, Lyon, Toulouse et Nice, Place de la République, rond-point populaire vers Le Mans, préfecture régionale de Bordeaux, université militante de Grenoble, plateau média parisien, marché national de Rungis et commune verte dans le nord.

Les bastions parisiens sont légèrement décalés entre eux pour rester cliquables sans surcharger la carte.

## Création de bastions

Un joueur connecté peut créer un bastion sans coût ni limite. Le front ouvre un mode “Créer un bastion”, capture le clic sur la carte, demande un nom, crée le bastion localement puis appelle `api/forts.php` pour le persister dans `pcw_forts` avec la catégorie `player_created`.

## Refinement V12 — carte vectorielle fixe

La carte France est rendue comme un SVG local dans `assets/maps/france.svg`. Le zoom est appliqué uniquement au calque SVG `#mapWorld`. Les calques interactifs `#entitiesLayer` et `#projectilesLayer` restent hors du calque zoomé : leurs positions écran sont recalculées par `toScreenX()` / `toScreenY()` à chaque rendu.

Conséquence : la carte reste vectorielle pendant le zoom et les bastions gardent une taille fixe dans le navigateur. Le zoom sert donc à séparer visuellement les bastions proches, notamment autour de Paris, sans transformer les icônes en gros sprites.

Les coordonnées par défaut utilisent une projection normalisée proche longitude/latitude sur la France métropolitaine : `x` va de l’ouest vers l’est, `y` du nord vers le sud, en pourcentage du viewBox SVG.

## Raffinement 008 — carte France officielle stylisée

La carte `assets/maps/france.svg` utilise maintenant une silhouette vectorielle détaillée de la France métropolitaine, avec la Corse, un fond noir et un décor discret. La géométrie est alignée sur une projection normalisée lon/lat : longitude `[-5.35, 10.13]`, latitude `[41.02, 51.27]`. Les coordonnées des bastions par défaut sont recalculées avec quatre décimales afin de rester cohérentes au zoom fort.

Le zoom/pan existant est conservé : le SVG est transformé dans `mapWorld`, tandis que les bastions restent rendus sur le calque HTML au-dessus. Leur position suit le zoom, mais leur taille visuelle reste fixe par rapport au navigateur.

