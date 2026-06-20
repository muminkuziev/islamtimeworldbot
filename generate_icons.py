"""Generate app icons for Islam Time World."""
import math, os
from PIL import Image, ImageDraw

os.chdir(os.path.dirname(os.path.abspath(__file__)))

def create_icon(size):
    img = Image.new('RGBA', (size, size), (8, 13, 26, 255))
    d = ImageDraw.Draw(img)
    s = size
    scale = s / 200.0
    gold  = (245, 197, 66, 255)
    dark  = (13, 20, 41, 255)
    dark2 = (20, 30, 53, 220)

    # Background circle
    m = int(s * 0.04)
    d.ellipse([m, m, s-m, s-m], fill=(12, 18, 36, 255))

    # Gold outer ring
    rw = max(2, int(s * 0.007))
    d.ellipse([int(s*0.05), int(s*0.05), int(s*0.95), int(s*0.95)],
              outline=(197, 162, 39, 90), width=rw)

    # Left minaret
    d.rectangle([int(30*scale), int(82*scale), int(48*scale), int(156*scale)], fill=gold)
    d.polygon([(int(39*scale), int(63*scale)),
               (int(30*scale), int(82*scale)),
               (int(48*scale), int(82*scale))], fill=gold)
    d.rectangle([int(33*scale), int(130*scale), int(45*scale), int(134*scale)], fill=dark2)

    # Right minaret
    d.rectangle([int(152*scale), int(82*scale), int(170*scale), int(156*scale)], fill=gold)
    d.polygon([(int(161*scale), int(63*scale)),
               (int(152*scale), int(82*scale)),
               (int(170*scale), int(82*scale))], fill=gold)
    d.rectangle([int(155*scale), int(130*scale), int(167*scale), int(134*scale)], fill=dark2)

    # Mosque body
    d.rectangle([int(46*scale), int(108*scale), int(154*scale), int(156*scale)], fill=gold)

    # Main dome (pieslice)
    dx1, dy1 = int(58*scale), int(58*scale)
    dx2, dy2 = int(142*scale), int(100*scale)
    dom_h = dy2 - dy1
    d.pieslice([dx1, dy1 - dom_h, dx2, dy2], start=180, end=360, fill=gold)

    # Entrance arch
    d.polygon([
        (int(85*scale), int(156*scale)),
        (int(85*scale), int(130*scale)),
        (int(100*scale), int(118*scale)),
        (int(115*scale), int(130*scale)),
        (int(115*scale), int(156*scale)),
    ], fill=dark2)

    # Crescent moon
    mx, my = int(100*scale), int(37*scale)
    r1 = int(14*scale)
    d.ellipse([mx-r1, my-r1, mx+r1, my+r1], fill=gold)
    off = int(9*scale)
    d.ellipse([mx-r1+off, my-r1-int(2*scale), mx+r1+off, my+r1-int(2*scale)], fill=dark)

    # 4-pointed star
    sx, sy = int(118*scale), int(27*scale)
    so, si = int(6*scale), int(3*scale)
    pts = []
    for i in range(8):
        angle = math.radians(i * 45 - 90)
        r = so if i % 2 == 0 else si
        pts.append((sx + int(r*math.cos(angle)), sy + int(r*math.sin(angle))))
    d.polygon(pts, fill=gold)

    return img

img1024 = create_icon(1024)
img1024.save('resources/icon.png')
print('resources/icon.png  (1024x1024) OK')

img512 = img1024.resize((512, 512), Image.LANCZOS)
img512.save('webapp/assets/icons/icon-512.png')
print('webapp/assets/icons/icon-512.png OK')

img192 = img1024.resize((192, 192), Image.LANCZOS)
img192.save('webapp/assets/icons/icon-192.png')
print('webapp/assets/icons/icon-192.png OK')

print('Done.')
