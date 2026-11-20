"""
make_icons.py: draws the StridesWithSuaz app icons (S on top, a W-shaped hill
run line, S below). Needs Python with Pillow and the DejaVu Sans Bold font.

    python3 scripts/make_icons.py

Writes the main two-tone icon set to public/icons (plus favicon-32.png in
public) and the dark alternate to docs/icons. Run it again after changing the
design, then commit the PNGs.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
S = 1024  # draw large, then shrink

WHITE = (255, 255, 255)
MINT = (190, 245, 236)
TEAL = (11, 122, 111)
TEAL_DARK = (8, 70, 66)
TEAL_LIGHT = (79, 209, 192)
NAVY = (15, 20, 25)

# the W: start high, valley, small hill, valley, finish high
W_POINTS = [(190, 420), (350, 610), (512, 470), (674, 610), (834, 420)]


def vertical_gradient(top, bottom):
    img = Image.new('RGBA', (S, S))
    px = img.load()
    for y in range(S):
        t = y / S
        colour = tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)) + (255,)
        for x in range(S):
            px[x, y] = colour
    return img


def catmull_rom(points, steps=200):
    pts = [points[0]] + points + [points[-1]]
    out = []
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[i + 1], pts[i + 2]
        for k in range(steps + 1):
            t = k / steps
            out.append(tuple(
                0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t
                       + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t * t
                       + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t ** 3)
                for j in range(2)))
    return out


def glyphs(letter_colour, line_colour, hole_colour):
    """The S, W and S on a transparent layer."""
    layer = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    font = ImageFont.truetype(FONT, 380)
    for centre_y in (225, 800):
        box = d.textbbox((0, 0), 'S', font=font)
        w, h = box[2] - box[0], box[3] - box[1]
        d.text(((S - w) / 2 - box[0], centre_y - h / 2 - box[1]), 'S', font=font, fill=letter_colour)
    r = 38
    for x, y in catmull_rom(W_POINTS):
        d.ellipse([x - r, y - r, x + r, y + r], fill=line_colour)
    (sx, sy), (ex, ey) = W_POINTS[0], W_POINTS[-1]
    for x, y in ((sx, sy), (ex, ey)):
        d.ellipse([x - r * 1.6, y - r * 1.6, x + r * 1.6, y + r * 1.6], fill=line_colour)
    d.ellipse([ex - r * 0.65, ey - r * 0.65, ex + r * 0.65, ey + r * 0.65], fill=hole_colour)
    return layer


def rounded(img, radius=0.22):
    mask = Image.new('L', img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * radius), fill=255)
    out = Image.new('RGBA', img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


def compose(background, layer, rounded_corners=True, content_scale=1.0):
    if content_scale != 1.0:
        size = int(S * content_scale)
        small = layer.resize((size, size), Image.LANCZOS)
        layer = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        layer.paste(small, ((S - size) // 2, (S - size) // 2), small)
    img = Image.alpha_composite(background, layer)
    return rounded(img) if rounded_corners else img


def save(img, path, size):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.resize((size, size), Image.LANCZOS).save(path, optimize=True)


def main():
    main_bg = vertical_gradient(TEAL, TEAL_DARK)
    main_layer = glyphs(WHITE, MINT, TEAL)
    icons = ROOT / 'public' / 'icons'
    save(compose(main_bg, main_layer), icons / 'icon-512.png', 512)
    save(compose(main_bg, main_layer), icons / 'icon-192.png', 192)
    # Maskable: full bleed, with the art kept inside the middle 80% safe zone.
    save(compose(main_bg, main_layer, rounded_corners=False, content_scale=0.8), icons / 'icon-maskable-512.png', 512)
    # iPhone rounds the corners itself, so no transparency.
    save(compose(main_bg, main_layer, rounded_corners=False), icons / 'apple-touch-icon.png', 180)
    save(compose(main_bg, main_layer), ROOT / 'public' / 'favicon-32.png', 32)

    dark_bg = Image.new('RGBA', (S, S), NAVY + (255,))
    dark_layer = glyphs(WHITE, TEAL_LIGHT, NAVY)
    save(compose(dark_bg, dark_layer), ROOT / 'docs' / 'icons' / 'alt-dark-512.png', 512)


if __name__ == '__main__':
    main()
