# Convertit le pack SpriteCanvas « swordsman » (CC0) en un atlas WebP unique + src/05-sprites.js.
# Usage : python -I tools/sprites.py <dossier du pack>/animations
# Seules les animations « east » sont gardées (le jeu retourne l'image pour l'autre côté).
import sys, json, base64, io, os
from PIL import Image

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', '05-sprites.js')

# animation du jeu -> (animation source, indices de frames, ms par frame, boucle)
CLIPS = {
    'idle':    ('idle',   list(range(0, 35, 2)), 200, True),
    'run':     ('run',    list(range(9)),        80,  True),
    'windup':  ('attack', list(range(15, 24)),   45,  False),
    'strike':  ('attack', list(range(26, 32)),   24,  False),
    'hit':     ('hurt',   list(range(0, 16, 2)), 70,  False),
    'dodge':   ('hurt',   [2, 4, 6, 8],          60,  False),
    'block':   ('skill',  [0, 1, 2],             60,  False),
    'victory': ('skill',  [3, 4, 5, 6],          90,  False),
    'ko':      ('death',  list(range(0, 24, 2)), 80,  False),
}

atlases, meta = {}, {}
def frame(anim, i):
    if anim not in atlases:
        atlases[anim] = Image.open(os.path.join(SRC, anim + '_east', 'atlas.png')).convert('RGBA')
        meta[anim] = json.load(open(os.path.join(SRC, anim + '_east', 'export.json'), encoding='utf-8'))
    r = meta[anim]['frames'][i]['rect']
    return atlases[anim].crop((r['x'], r['y'], r['x'] + r['width'], r['y'] + r['height']))

keys = []
for name, (anim, idx, ms, loop) in CLIPS.items():
    for i in idx:
        if (anim, i) not in keys: keys.append((anim, i))
imgs = {k: frame(*k) for k in keys}

# cadre commun (union des zones non transparentes) : le pivot reste au même endroit pour toutes les frames
bx0, by0, bx1, by1 = 10**9, 10**9, 0, 0
for im in imgs.values():
    b = im.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    if b: bx0, by0, bx1, by1 = min(bx0, b[0]), min(by0, b[1]), max(bx1, b[2]), max(by1, b[3])
bx0, by0 = max(0, bx0 - 2), max(0, by0 - 2)
fw, fh = bx1 + 2 - bx0, by1 + 2 - by0
pv = meta['idle']['frames'][0]['pivot']; sw = meta['idle']['frames'][0]['source_size']
px, py = pv['x'] * sw['width'] - bx0, pv['y'] * sw['height'] - by0
# hauteur du personnage debout (sommet de la tête -> pieds) pour l'échelle en jeu
ib = imgs[('idle', 0)].getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
stand = pv['y'] * sw['height'] - ib[1]

cols = 10; rows = (len(keys) + cols - 1) // cols
sheet = Image.new('RGBA', (cols * fw, rows * fh), (0, 0, 0, 0))
for n, k in enumerate(keys):
    sheet.paste(imgs[k].crop((bx0, by0, bx0 + fw, by0 + fh)), ((n % cols) * fw, (n // cols) * fh))
buf = io.BytesIO(); sheet.save(buf, 'WEBP', quality=82, method=6)
b64 = base64.b64encode(buf.getvalue()).decode()

clips = {name: {'f': [keys.index((anim, i)) for i in idx], 'ms': ms, 'loop': loop} for name, (anim, idx, ms, loop) in CLIPS.items()}
js = ('/* ===== SPRITES : héros épéiste peint (SpriteCanvas, CC0 / domaine public). Généré par tools/sprites.py, ne pas éditer. ===== */\n'
      'const SPRITE_SWORDSMAN = ' + json.dumps({'fw': fw, 'fh': fh, 'cols': cols, 'px': round(px, 1), 'py': round(py, 1), 'stand': round(stand, 1), 'clips': clips}) + ';\n'
      'SPRITE_SWORDSMAN.src = "data:image/webp;base64,' + b64 + '";\n')
open(OUT, 'w', encoding='utf-8').write(js)
print('frames', len(keys), 'cell', fw, 'x', fh, 'sheet', sheet.size, 'webp KB', len(buf.getvalue()) // 1024, 'stand', stand)
