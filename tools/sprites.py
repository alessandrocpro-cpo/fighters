# Convertit les packs SpriteCanvas (CC0, domaine public) en un atlas WebP par personnage
# (assets/sprites/<id>.webp) + leurs métadonnées dans src/05-sprites.js.
# Usage : python tools/sprites.py [dossier des packs, par défaut characters/]
# Seules les animations « east » sont gardées (le jeu retourne l'image pour l'autre côté).
import sys, json, os
from PIL import Image

DL = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'characters')
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT_DIR = os.path.join(ROOT, 'assets', 'sprites')
r = lambda a, b, s=1: list(range(a, b, s))

# id: (dossier du pack, nom affiché, hauteur en jeu, portée, demi-largeur, pixel art, clips)
# clip du jeu -> (animation source, frames, ms par frame, boucle)
CHARS = {
  'swordsman': ('swordsman-character-pack/swordsman', 'Chevalier', 154, 74, 10, False, {
    'idle': ('idle', r(0, 35, 2), 200, True), 'run': ('run', r(0, 9), 80, True),
    'windup': ('attack', r(15, 24), 45, False), 'strike': ('attack', r(26, 32), 24, False),
    'hit': ('hurt', r(0, 16, 2), 70, False), 'dodge': ('hurt', [2, 4, 6, 8], 60, False),
    'block': ('skill', [0, 1, 2], 60, False), 'victory': ('skill', [3, 4, 5, 6], 90, False),
    'ko': ('death', r(0, 24, 2), 80, False)}),
  'samurai': ('lantern-samurai-character-pack/lantern-samurai', 'Samouraï', 160, 76, 10, False, {
    'idle': ('idle', r(0, 12), 100, True), 'run': ('walk', r(0, 8), 90, True),
    'windup': ('iaijutsu', [0, 1, 2, 3], 60, False), 'strike': ('iaijutsu', r(4, 10), 40, False),
    'hit': ('death', [1, 2], 90, False), 'dodge': ('walk', [0, 2, 4], 60, False),
    'block': ('parry', [1, 2, 3], 60, False), 'victory': ('parry', [1], 100, False),
    'ko': ('death', r(0, 10), 80, False)}),
  'mech': ('mech-bot-character-pack/mech-bot', 'MechBot', 165, 80, 12, False, {
    'idle': ('idle', r(0, 10), 110, True), 'run': ('march', r(0, 8), 90, True),
    'windup': ('laser', [0, 1, 2, 3], 60, False), 'strike': ('laser', r(4, 10), 40, False),
    'hit': ('overheat', [0, 2, 4, 6], 70, False), 'dodge': ('march', [0, 2, 4], 60, False),
    'block': ('overheat', [1, 2], 60, False), 'victory': ('idle', [0], 110, False),
    'ko': ('shutdown', r(0, 10), 80, False)}),
  'knight': ('pixel-knight-character-pack/pixel-knight', 'Chevalier de fer', 150, 72, 10, True, {
    'idle': ('idle', r(0, 8), 120, True), 'run': ('walk', r(0, 8), 90, True),
    'windup': ('attack', [0, 1, 2], 70, False), 'strike': ('attack', r(3, 8), 45, False),
    'hit': ('death', [1], 120, False), 'dodge': ('block', [1, 2], 60, False),
    'block': ('block', [1, 2, 3], 60, False), 'victory': ('attack', [2], 100, False),
    'ko': ('death', r(0, 10), 90, False)}),
  'necro': ('pixel-necromancer-character-pack/pixel-necromancer', 'Mage d\'os', 160, 72, 10, True, {
    'idle': ('idle', r(0, 8), 120, True), 'run': ('walk', r(0, 8), 100, True),
    'windup': ('bolt', [0, 1, 2], 70, False), 'strike': ('bolt', r(3, 8), 45, False),
    'hit': ('death', [1, 2], 90, False), 'dodge': ('walk', [1, 3], 60, False),
    'block': ('summon', [2, 3], 60, False), 'victory': ('summon', r(4, 10), 90, False),
    'ko': ('death', r(0, 8), 100, False)}),
  'rogue': ('pixel-rogue-character-pack/pixel-rogue', 'Ombre', 150, 70, 9, True, {
    'idle': ('idle', r(0, 8), 125, True), 'run': ('run', r(0, 8), 80, True),
    'windup': ('dagger-combo', [0, 1], 70, False), 'strike': ('dagger-combo', r(2, 8), 40, False),
    'hit': ('dash', [2, 3], 80, False), 'dodge': ('dash', [1, 2, 3], 60, False),
    'block': ('dash', [3, 4], 60, False), 'victory': ('idle', [0], 125, False),
    'ko': ('death', r(0, 8), 100, False)}),
  'goblin': ('goblin-character-pack/goblin', 'Gobelin', 120, 62, 10, False, {
    'idle': ('idle', r(0, 21, 2), 90, True), 'run': ('walk', r(0, 20, 2), 55, True),
    'windup': ('attack', [0, 2, 4, 6], 55, False), 'strike': ('attack', r(8, 22, 2), 32, False),
    'hit': ('hurt', r(0, 10, 2), 60, False), 'dodge': ('hurt', [2, 4, 6], 60, False),
    'block': ('hurt', [1, 2], 60, False), 'victory': ('attack', [6], 100, False),
    'ko': ('death', r(0, 19, 2), 80, False)}),
  'golem': ('golem-character-pack/golem', 'Golem', 185, 86, 22, False, {
    'idle': ('idle', r(0, 21, 2), 100, True), 'run': ('walk', r(0, 20, 2), 60, True),
    'windup': ('attack', [0, 2, 4, 6, 8], 60, False), 'strike': ('attack', r(10, 24, 2), 35, False),
    'hit': ('hurt', r(0, 8, 2), 70, False), 'dodge': ('hurt', [2, 4], 60, False),
    'block': ('hurt', [1, 2], 60, False), 'victory': ('attack', [6], 100, False),
    'ko': ('death', r(0, 24, 2), 80, False)}),
  'mushroom': ('mushroom-character-pack/mushroom', 'Champignon', 115, 58, 10, False, {
    'idle': ('idle', r(0, 21, 2), 100, True), 'run': ('walk', r(0, 12), 60, True),
    'windup': ('attack', [0, 2, 4, 6], 60, False), 'strike': ('attack', r(8, 19, 2), 35, False),
    'hit': ('hurt', r(0, 11, 2), 60, False), 'dodge': ('hurt', [2, 4], 60, False),
    'block': ('hurt', [1, 2], 60, False), 'victory': ('attack', [4], 100, False),
    'ko': ('death', r(0, 17, 2), 80, False)}),
  'slime': ('slime-character-pack/slime', 'Pousse-gelée', 72, 50, 8, False, {
    'idle': ('idle', r(0, 35, 3), 100, True), 'run': ('walk', r(0, 12), 70, True),
    'windup': ('attack', [0, 2, 4, 5], 60, False), 'strike': ('attack', [7, 9, 10, 12, 14, 17, 20], 35, False),
    'hit': ('hurt', r(0, 8), 60, False), 'dodge': ('walk', [2, 4, 6], 60, False),
    'block': ('hurt', [1, 2], 60, False), 'victory': ('walk', [3], 100, False),
    'ko': ('death', r(0, 21, 2), 70, False)}),
  'slimeboss': ('slime-boss-character-pack/slime-boss', 'Roi gélatine', 170, 92, 30, False, {
    'idle': ('idle', r(0, 10), 110, True), 'run': ('hop', r(0, 8), 90, True),
    'windup': ('slam', [0, 1, 2], 70, False), 'strike': ('slam', r(3, 10), 45, False),
    'hit': ('death', [1], 150, False), 'dodge': ('hop', [3, 4], 60, False),
    'block': ('split', [1, 2], 60, False), 'victory': ('idle', [0], 110, False),
    'ko': ('death', r(0, 10), 100, False)}),
  'slimeking': ('pixel-slime-king-character-pack/pixel-slime-king', 'Roi épineux', 150, 86, 28, True, {
    'idle': ('idle', r(0, 8), 120, True), 'run': ('bounce', r(0, 8), 90, True),
    'windup': ('bounce', [0, 1, 2], 70, False), 'strike': ('spike-burst', r(1, 8), 45, False),
    'hit': ('hurt', r(0, 6), 70, False), 'dodge': ('bounce', [3, 4], 60, False),
    'block': ('hurt', [1, 2], 60, False), 'victory': ('spike-burst', [2], 100, False),
    'ko': ('death', r(0, 8), 100, False)}),
}

def alpha_box(im):
    return im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()

os.makedirs(OUT_DIR, exist_ok=True)
meta_all = {}
for cid, (path, name, H, reach, body, pixel, clips) in CHARS.items():
    base = os.path.join(DL, path)
    pack = json.load(open(os.path.join(base, 'character.json'), encoding='utf-8'))
    anims = {a['action_id']: a for a in pack['animations'] if a['direction'] == 'east'}
    cache = {}
    def frame(anim, i):
        if anim not in cache:
            a = anims[anim]
            cache[anim] = (Image.open(os.path.join(base, a['atlas'])).convert('RGBA'), json.load(open(os.path.join(base, a['export']), encoding='utf-8')))
        at, ex = cache[anim]; f = ex['frames'][i]; R = f['rect']; S = f['source_size']
        im = at.crop((R['x'], R['y'], R['x'] + R['width'], R['y'] + R['height']))
        # position de l'image dans le cadre source, puis pivot (les pieds) dans ce cadre
        ox, oy = f['trim_offset']['x'], f['trim_offset']['y']
        return im, f['pivot']['x'] * S['width'] - ox, f['pivot']['y'] * S['height'] - oy
    keys = []
    for (anim, idx, ms, loop) in clips.values():
        for i in idx:
            if (anim, i) not in keys: keys.append((anim, i))
    frames = {k: frame(*k) for k in keys}
    # cadre commun centré sur le pivot : union des zones visibles, relatives au pivot
    L = T = 10**9; Rr = B = -10**9
    for im, px, py in frames.values():
        b = alpha_box(im)
        if b: L, T, Rr, B = min(L, b[0] - px), min(T, b[1] - py), max(Rr, b[2] - px), max(B, b[3] - py)
    L, T, Rr, B = int(L) - 2, int(T) - 2, int(Rr) + 2, int(B) + 2
    fw, fh = Rr - L, B - T
    cols = max(1, min(len(keys), 4096 // fw))
    rows = (len(keys) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * fw, rows * fh), (0, 0, 0, 0))
    for n, k in enumerate(keys):
        im, px, py = frames[k]
        sheet.paste(im, (int((n % cols) * fw - L - px), int((n // cols) * fh - T - py)), im)
    fn = os.path.join(OUT_DIR, cid + '.webp')
    if pixel: sheet.save(fn, 'WEBP', lossless=True, method=6)
    else: sheet.save(fn, 'WEBP', quality=82, method=6)
    # hauteur debout et position de la tête (portraits), mesurées sur la 1re frame de repos
    im, px, py = frames[(clips['idle'][0], clips['idle'][1][0])]
    b = alpha_box(im); stand = py - b[1]
    band = im.crop((b[0], b[1], b[2], b[1] + max(4, int(stand * .14)))).getchannel('A')
    xs = [x for x in range(band.width) for y in range(0, band.height, 2) if band.getpixel((x, y)) > 8]
    headX = (sum(xs) / len(xs) + b[0] - px) if xs else 0
    meta_all[cid] = {'name': name, 'src': 'sprites/' + cid + '.webp', 'fw': fw, 'fh': fh, 'cols': cols,
                     'px': -L, 'py': -T, 'stand': round(stand, 1), 'headX': round(headX, 1), 'H': H, 'reach': reach,
                     'body': body, 'pixel': pixel,
                     'clips': {g: {'f': [keys.index((a, i)) for i in idx], 'ms': ms, 'loop': loop} for g, (a, idx, ms, loop) in clips.items()}}
    print(f'{cid:10} frames {len(keys):3} cell {fw}x{fh} sheet {sheet.size} {os.path.getsize(fn) // 1024} KB stand {stand:.0f}')

js = ('/* ===== SPRITES : personnages peints SpriteCanvas (CC0 / domaine public). Généré par tools/sprites.py, ne pas éditer. ===== */\n'
      'const SPRITES = ' + json.dumps(meta_all, ensure_ascii=False) + ';\n')
open(os.path.join(ROOT, 'src', '05-sprites.js'), 'w', encoding='utf-8').write(js)
print('total KB', sum(os.path.getsize(os.path.join(OUT_DIR, c + '.webp')) for c in CHARS) // 1024)
