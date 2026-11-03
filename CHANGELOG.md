# Changelog Climbrawl

Règle : on développe en continu (dépôt GitHub + page de test Claude). Une **release** = push sur la branche `release` (GitHub Pages), uniquement sur demande explicite (« release »). Chaque release incrémente `GAME_VERSION` (src/00-core.js) et ajoute une entrée ici, puis un tag git `vX.Y.Z`.

## Non publié (en cours)
- (rien)

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
