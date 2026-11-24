# Changelog Climbrawl

Règle : chaque version livrée part en même temps sur la page de test Claude (artefact) et sur GitHub : push sur `main` et `release` (GitHub Pages), plus un tag git `vX.Y.Z`. Chaque version incrémente `GAME_VERSION` (src/00-core.js) et ajoute une entrée ici.

## 0.9.1 — release publique (2026-11-23)
Tablette, grand écran et téléphone en paysage ; techniques automatiques expliquées.

Vérification du 2026-11-24 (aucun changement de jeu) :
- Artefact republié : il affichait « 0.9.0 » alors qu'il contenait déjà la 0.9.1
- Tags git `v0.9.0` et `v0.9.1` ajoutés (ils manquaient)
- Dossier de travail local remis à jour depuis `main` (il était resté en 0.8.1)

Techniques automatiques expliquées.
- Tutoriel : la carte « Technique prête » prévient qu'à 100 de rage les techniques partent toutes seules ; nouvelle carte « Lancement automatique » la première fois que ça arrive
- Options : « Techniques auto à rage pleine : oui / non »

Tablette (iPad) et grand écran, en portrait comme en paysage.
- L'app prend tout l'écran au-delà de 700 × 560 px (avant : colonne de 480 px au centre). Un téléphone, même en paysage, garde la colonne mobile
- Portrait : contenu en colonne centrée élargie (720 px), portraits, aperçu de création et grilles agrandis (sac et collection en colonnes auto)
- Paysage (≥ 900 px) : navigation en rail à gauche, Héros (stats) et Sac sur 2 colonnes, Tour en colonne de 760 px
- Combat paysage : cadrage calé sur la hauteur (`VIEW_H`, 70-arena), décor prolongé en miroir sur les côtés (dirigeables et particules compris), HUD et commandes centrés
- Fenêtres (butin, pause, tutoriel) centrées et limitées à 560 px de large
- Hauteur en `100dvh` quand le navigateur le gère (barres Safari)
- Téléphone en paysage (iPhone tourné) : app pleine largeur, nav en rail à gauche, Héros et Sac sur 2 colonnes
- Combat sur téléphone en paysage : HUD resserré, commandes sur une seule bande basse (rage à gauche, techniques à droite), zoom plus serré et sol plus bas (`VIEW_H_LOW`)
- Tutoriel : la carte de bienvenue précise qu'on peut jouer en portrait ou en paysage en tournant l'appareil
- iOS : plus de texte grossi automatiquement en paysage (`text-size-adjust`)

## 0.9.0 — release publique (2026-11-23)
Tutoriel, sorts lisibles, familiers peints, tour plus longue.
- Tutoriel progressif : une carte par notion, au moment où on la découvre (bienvenue, coup parfait, parade, technique prête, continuer ou encaisser, première chute, points, familiers au niveau 5, point de technique, butin, portail). En combat, le jeu se met en pause sur le premier cercle et la fenêtre du premier tap est allongée. « Passer le tutoriel » à tout moment
- Bouclier : dôme protecteur autour du héros tant qu'il reste des charges (maillage, reflet, une gemme par charge), il s'illumine quand il encaisse et éclate quand il est épuisé
- Techniques : médaillon de la technique au-dessus du héros au lancement, et au-dessus de la cible quand l'effet part (coup dévastateur, brise-armure, cri) ; braises autour du héros tant que le coup dévastateur est chargé
- Chiffres de dégâts : dégradé continu du jaune (petit coup) au rouge (gros coup), rouge profond en critique
- XP en lavande, plus jamais dans le même vert que les soins
- Familiers redessinés dans le style des personnages peints : silhouette d'un seul tenant, grosse tête, modelé, yeux peints, poitrail clair ; plus grands à l'écran
- Difficulté : pente supplémentaire à partir de l'étage 25 (`DIFF.lateExp` 1,009). Bot : étage 50 en 137 à 206 combats (avant 131 à 151), étage 100 en 680 à 855 combats (avant 331 à 446). Le début ne change pas
- Correctif : attribuer des points (ou toute action dans un menu) ne fait plus remonter l'écran en haut
- Balises `noindex` remises dans la page

## 0.8.1 — release publique (2026-11-23)
Chiffres et level up façon jeu d'action.
- Chiffres de dégâts : police ronde épaisse (Lilita One), dégradé vertical, gros contour brun et relief ; ils claquent en grand puis se posent
- Couleur selon la part de vie retirée : blanc, or, orange, rouge ; critique et coup parfait en rouge flamboyant avec halo et étiquette « CRITIQUE » / « FRACAS » ; parade en bleu ; dégâts reçus par le héros en rouge rosé
- Soins et XP en vert ; « +N XP » sort de l'adversaire vaincu à la victoire
- Tous les textes de combat (ESQUIVE, BLOQUÉ, VICTOIRE…) passent au même style
- LEVEL UP plein écran : le héros dans un cercle magique doré qui tourne, colonne de lumière, étincelles, « Niveau X » et points à répartir ; s'affiche en fin de run (encaissé ou tombé) et quand le démantèlement fait monter de niveau

## 0.8.0 — release publique (2026-11-23)
Personnages peints pour tout le monde.
- Création : choix entre trois combattants peints animés, Chevalier, Samouraï et MechBot (onglet Héros : changer de personnage, ou revenir au héros « Dessiné »)
- Ennemis peints : gobelin, golem, champignon, pousse-gelée, chevalier de fer, mage d'os, ombre, samouraï, MechBot, chevalier ; le type dépend de l'origine de l'adversaire
- Boss : roi gélatine, roi épineux, golem, mage d'os… selon le palier
- Déclinaisons : chaque adversaire a sa couleur (teinte, saturation, luminosité), sa taille et sa silhouette, tirées de son nom et de son étage (toujours les mêmes pour un étage donné)
- Portée, hauteur des chiffres et pastilles adaptées à la taille de chaque créature
- Atlases WebP par personnage (3,2 Mo au total), chargés à la demande ; générés par `tools/sprites.py` depuis les packs SpriteCanvas (CC0, domaine public)
- L'écran de création ne propose plus la peau, la coiffure et les couleurs (elles ne servent qu'au héros « Dessiné »)

## 0.7.3 — release publique (2026-11-23)
- L'épéiste peint est aussi ton héros hors combat : avatar en haut de l'écran, fiche Héros, portrait du bandeau de combat
- Onglet Héros : choix « Apparence » (Épéiste peint / Dessiné), le même que dans le menu Pause
- La création de personnage reste dessinée (peau, coiffure, couleurs servent au héros « Dessiné »)

## 0.7.2 — release publique (2026-11-23)
Prototype : héros en sprite peint.
- En combat, le héros est l'épéiste peint du pack SpriteCanvas « swordsman » (CC0, domaine public) : repos, course, armé, frappe, coup reçu, esquive, garde, victoire, KO
- Atlas WebP unique (~0,5 Mo) généré par `tools/sprites.py` à partir du pack
- Menu Pause : « Apparence du héros (test) » pour revenir au héros dessiné en code (équipement visible)
- Limites du prototype : arme, armure et coiffure du héros ne se voient plus en combat ; ennemis restent dessinés en code

## 0.7.1 — release publique (2026-11-23)
Les moments forts du combat se voient et se comprennent.
- Coup parfait, parade, coup dévastateur : arrêt sur image, coup de zoom, flash d'écran et gros titre centré qui dit l'effet (« Dégâts ×1,5 », « Dégâts réduits de 70 % »), avec la série de coups parfaits
- Parade : arc de bouclier lumineux devant le héros dès le tap, dégâts affichés en bleu ; le blocage naturel s'appelle désormais « Bloqué » pour ne plus être confondu avec ta parade
- Réflexe manqué : « Raté », « Pas paré » ou « Trop tôt » en rouge
- Techniques : colonne de lumière, double onde, titre centré avec ce que fait la technique (« Prochain coup ×2,2, inesquivable », « −65 % sur les 2 prochains coups »…), effet visible sur la cible
- Bouton de technique : « Au prochain tour » en attente (contour qui pulse), « Lancée ! » au déclenchement avec flash de la jauge de rage ; rage insuffisante : le bouton tremble et la jauge passe en rouge
- Pastilles d'état au-dessus des têtes : Bouclier ×2, Dévastateur prêt, Brise-armure ×3, Étourdi, Affaibli
- Bouclier qui encaisse : « Bouclier : encore 1 » / « Bouclier épuisé »

## 0.7.0 — release publique (2026-11-23)
Combattants redessinés, plus proches d'une illustration anime peinte.
- Silhouette plus élancée (tête ~1/3 du corps), plus grands à l'écran, garde de boxe au repos
- Visage anime : grands yeux en amande, iris en dégradé, pupille, deux reflets, cils épais, sourcils froncés, nez, joues ; expressions conservées (douleur, cri de victoire, KO)
- Cheveux en volume : frange d'un seul tenant à pointes, séparations de mèches, anneau de lumière ; pointes indépendantes pour Pics et Crête
- Tenue en couches : tee-shirt clair, veste ouverte à col relevé, sangle en travers, double ceinture et sacoche, genouillères, bottes montantes à sangles, brassards lacés, mitaines
- Éclairage d'ensemble : chaque combattant est peint sur un calque puis éclairé (lumière chaude en haut, ombre au sol, liseré de contre-jour à la couleur du monde)
- Adversaires : marques au visage (cicatrice, peinture, pansement, tatouage)
- Correctif : un « null » s'affichait sous le bandeau de combat

## 0.6.1 — release publique (2026-11-22)
Interface en flat design pastel : le rose néon gênait la lecture.
- Fonds unis gris-bleu, coins arrondis, plus de dégradés, halos ni contours néon
- Une couleur = un sens : beurre (action principale, XP), ciel (défense, info), menthe (positif, PV du héros), pêche (attaque, rage), corail (danger, PV adverses), lavande (choix secondaire)
- Texte d'interface en Barlow Semi Condensed (plus net) ; la police pinceau reste pour les grands titres
- Combat : HUD sur cartes sombres lisibles, boutons de techniques pleins quand ils sont prêts, cercle de réflexe beurre / ciel, textes sans halo
- Raretés en pastel ; décors des Pont des Flèches et Toits Néon adoucis (moins de rose)

## 0.6.0 — release publique (2026-11-22)
Refonte visuelle complète, toutes les mécaniques de la 0.5.3 conservées.
- Style fantasy gothique steampunk au crépuscule, néons rose et cyan, panneaux sombres à coins coupés
- 10 nouveaux mondes sombres (Pont des Flèches, Docks de Brume, Fonderie Écarlate, Toits Néon, Serres de Verre, Bas-Fonds Chimiques, Arène des Barons, Beffroi de Cendre, L'Observatoire, Le Sommet), dirigeables et particules
- Nouveaux combattants chibi : cel-shading à liseré néon, gilet, sangles, bandages, gros poings ; coiffures Tresse et Crête, nouvelles couleurs
- Combat plein écran : HUD par-dessus le décor, bannière au pinceau « Coup parfait » (et série de coups parfaits), cercle de réflexe « TAPE » / « PARE » avec main pour les premiers combats, jauge de rage néon, techniques en grands boutons (1 à 3), bouton pause (vitesse x1 à x3, passer le combat)
- Le décor du palier en cours sert de fond flouté à toute l'app
- Polices : Permanent Marker, Kalam, Barlow Semi Condensed

## 0.5.3 — release publique (2026-11-03)
- Sac : bouton « Tout optimiser » (équipe le meilleur partout, démantèle les objets moins bons ; aperçu exact du résultat sur le bouton)
- Chaque objet affiche son gain de puissance (▲ +N) ou ▼ s'il est moins bon : plus besoin d'ouvrir chaque objet. Aussi sur l'écran de victoire
- Après chaque run : équipement automatique + démantèlement auto des objets inutiles communs et peu communs (option). Légendaires et familiers de boss jamais démantelés automatiquement
- Correctif : l'XP de démantèlement va directement au héros (avant, pendant un run, elle allait dans le pot du run et la moitié était perdue en cas de mort). Message de montée de niveau

## 0.5.2 — release (2026-11-03)
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
