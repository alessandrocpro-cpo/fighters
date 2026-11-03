# CLIMBRAWL · La Tour aux cent étages

MVP jouable. Ouvrir `index.html` dans un navigateur (mobile ou desktop). Sauvegarde : navigateur du joueur + code d'export. Le code de sauvegarde sur compte Claude (capacité `db`) reste en place mais n'est pas activé sur la page publiée, car il impose une connexion.

## Boucle de jeu (rogue-lite)
- **Run** = une montée depuis l'étage 1 ou depuis un portail (ouvert après chaque boss).
- Combats façon MyBrute, mais interactifs : tap au bon moment = coup parfait ou parade sur les coups « ! ». Rage + techniques actives (2 par combat, 3 au niveau 20), à choisir selon les traits de l'adversaire. « Passer » = fin en automatique. Vie persistante dans le run (+20% PV par victoire, 3 fioles).
- **Tension continuer / encaisser** : après chaque victoire, 2 boutons. Encaisser = XP complète + tous les objets du run. Tomber = objets du run perdus + moitié de l'XP du run (`DEATH_XP_KEEP`).
- **Niveau** = 3 points à répartir librement : Force, Agilité, Vitesse, Vitalité (PV). Bouton « Conseil » selon l'origine.
- Tous les 3 niveaux : **Choix de la Brute** entre 2 bonus (pouvoir, familier, PV, points).
- **Sanctuaire** (tous les 5 étages) : vie et fioles restaurées. Ne sécurise plus rien : tout reste en jeu jusqu'à la retraite.
- **Familiers** : emplacements aux niveaux 5, 15, 30. Loot sur les étages (5%) et les boss (15%). Chaque boss de palier a un familier exclusif légendaire (6%) : à farmer via les portails.
- Les ennemis ont aussi des familiers à partir de l'étage 12. Les coups se répartissent entre combattant et familiers.
- Démanteler un objet = XP.
- **Collection** (onglet Héros) façon MyBrute : grille de tous les pouvoirs, armes, familiers et familiers de boss. Débloqué = tuile dorée, verrouillé = estompé, détail au toucher.

## Visuel
Héros chibi style « flash » (grosse tête, corps trapu, pieds nus, gilet ouvert, dégradés doux, trait brun fin). Un monde lumineux par palier (prés, bois, canyon, neiges, jardins, lagon, arène, cendres, observatoire, sommet). Tout est dessiné en code.

## Architecture (`src/`, assemblé par `node tools/build.mjs`)
| Fichier | Rôle |
|---|---|
| 00-core | RNG déterministe, utilitaires |
| 10-data | **Tout le contenu** : stats, origines, armes, affixes, pouvoirs, paliers, familiers, familiers de boss |
| 20-character | Stats dérivées, puissance, familiers, XP, niveaux, choix |
| 30-loot | Objets et familiers |
| 40-enemy | Adversaire fixe par étage + familiers + courbe de difficulté (`DIFF`) |
| 50-combat | Moteur pas à pas déterministe (`createFight` : next/resolve/useActive/runAuto), coups pré-tirés |
| 60-render-char | Héros manga + familiers (canin, félin, ours) |
| 70-arena | Décors par palier, effets, bruitages, lecteur de combat |
| 75-music | Musique procédurale WebAudio : boucle menu (do majeur, 96 bpm) et boucle combat (la mineur, 142 bpm), fondu enchaîné |
| 80-ui | Composants DOM réutilisables |
| 90-main | État, run, écrans |

## Outils
- `node tools/build.mjs` : génère `dist/index.html` (autonome) et `dist/artifact.html`.
- `node tools/balance.mjs 2500 4` : bot rogue-lite (répartition gloutonne, retraite quand le risque dépasse le gain attendu).
- `node tools/e2e.cjs <dossier>` : parcours complet mobile + captures (Playwright).

## Réglages
- `DIFF` (40-enemy), `xpToNext`, `xpReward`, `WIN_HEAL` (20-character), `POINTS_PER_LEVEL`, `CHOICE_EVERY`, `DEATH_XP_KEEP`, `PET_SLOT_LEVELS`, `BOSS_PET_CHANCE` (10-data).

## Process de release
- **Développement continu** : chaque changement est poussé sur GitHub (`main`) et publié sur la page de test Claude.
- **Release** (sur demande explicite uniquement) : incrémenter `GAME_VERSION`, compléter `CHANGELOG.md`, puis pousser `main` sur la branche `release` du dépôt public. GitHub Pages publie uniquement la branche `release` : https://alessandrocpro-cpo.github.io/fighters/
- **Dépôt public** : ne contient que le jeu (src, index.html, build, bot). Le dossier `knowledge/`, les tests et les captures restent en local. Commits signés avec l'email noreply GitHub. Balises `noindex` dans le jeu.
- La version s'affiche dans l'onglet Héros (Options) pour savoir quelle version un testeur utilise.
