# Changelog Climbrawl

Règle : on développe en continu (dépôt GitHub + page de test Claude). Une **release** = push sur la branche `release` (GitHub Pages), uniquement sur demande explicite (« release »). Chaque release incrémente `GAME_VERSION` (src/00-core.js) et ajoute une entrée ici, puis un tag git `vX.Y.Z`.

## Non publié (en cours)
- (rien)

## 0.5.2 — release publique (2026-11-03)
- Dessin vectoriel : traits d'encrage effilés (épais au centre, pointus aux bouts) pour cils, sourcils, bouche, mèches, doigts
- Mèches courbées dans le sens du pinceau, traînées de reflet le long des grandes mèches
- Ombre portée de la frange sur le front, ombre de nuque et sous la joue
- Poings avec doigts repliés et pouce

## 0.5.1
- Style chibi manga : tête x1,45, trait encre épais en silhouette et fin à l'intérieur, ombres franches, reflets brillants sur les cheveux, grands yeux à reflets, rougeurs hachurées, mèches courbes
- Kimono croisé à manches courtes, ceinture nouée, pantalon bouffant à plis, bottes, gros poings ; pose de victoire poings serrés
- Rendu jusqu'à 3x la résolution de l'écran

## 0.5.0
- Nom : Climbrawl
- Combat interactif : coup parfait (x1,5) en tapant quand le cercle se ferme, parade (x0,3 dégâts) sur les coups dangereux signalés « ! »
- Rage + 6 techniques actives (Coup dévastateur, Brise-armure, Bouclier, Balayage, Cri de guerre, Second vent), rangs 1 à 3, 1 point tous les 2 niveaux
- Traits d'adversaire (Insaisissable, Cuirassé, Frappe lourde, Meute, Increvable, Rapide) et techniques conseillées ; 2 emportées par combat (3 au niveau 20), changement en 1 tap sur la fiche
- Orbes d'XP à attraper pendant le combat
- Résultat appliqué après le combat ; recharger la page résout le combat en automatique (même tirage)
- Équiper le meilleur (bouton Sac + automatique après un run), Répartir auto
- UX : 1 tap pour lancer run + combat, plus de confirmation de retraite, écran de mort avec Rejouer, options dans l'engrenage, Héros en 3 onglets, bouton principal collant

## 0.4.0 — candidate à la 1re release Netlify
- Run rogue-lite : continuer ou encaisser (mort = butin du run perdu + moitié de l'XP)
- Points de stats à répartir, Choix de la Brute tous les 3 niveaux
- Familiers (loot, exclusifs de boss), combat multi-unités
- Héros chibi style flash, 10 mondes lumineux
- Collection façon MyBrute (pouvoirs, armes, familiers)
- Comparateur d'équipement, explications puissance / démantèlement
- Musique menu et combat
- Sauvegarde navigateur + code d'export
