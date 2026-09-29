from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(r"C:\Projects\IslamTimeWorldBot")
WEB = ROOT / "webapp"
ANDROID = ROOT / "android" / "app" / "src" / "main" / "res"
BRANDING = WEB / "assets" / "branding"
# Owner-supplied official artwork (rounded square on white with drop shadow).
SOURCE = BRANDING / "official-icon-raw.jpg"
# Rounded-square bounds and corner radius measured on the 1254px raw image.
BOX = (47, 31, 1209, 1190)
RADIUS = 272
INSET = 4  # trims the anti-aliased white fringe
MASTER_SIZE = 1024
LAUNCHER_BG = (6, 70, 45, 255)  # icon frame green, keep in sync with ic_launcher_background.xml
SPLASH_BG = (255, 255, 255, 255)  # matches capacitor SplashScreen.backgroundColor

raw = Image.open(SOURCE).convert("RGBA").crop(BOX)
master = raw.resize((MASTER_SIZE, MASTER_SIZE), Image.Resampling.LANCZOS)
scale = MASTER_SIZE / (BOX[2] - BOX[0])
ss = 4  # supersampled mask for smooth corners
mask = Image.new("L", (MASTER_SIZE * ss, MASTER_SIZE * ss), 0)
ImageDraw.Draw(mask).rounded_rectangle(
    (INSET * ss, INSET * ss, (MASTER_SIZE - INSET) * ss, (MASTER_SIZE - INSET) * ss),
    radius=int(RADIUS * scale * ss), fill=255,
)
master.putalpha(mask.resize((MASTER_SIZE, MASTER_SIZE), Image.Resampling.LANCZOS))
# In-app logo shows at <=110px; 320px covers 3x screens.
master.resize((320, 320), Image.Resampling.LANCZOS).save(BRANDING / "official-icon.png", optimize=True)

# Maskable PWA icon: opaque full-bleed, artwork inside the 80% safe zone.
maskable = Image.new("RGBA", (512, 512), LAUNCHER_BG)
art = master.resize((420, 420), Image.Resampling.LANCZOS)
maskable.alpha_composite(art, (46, 46))
maskable.convert("RGB").save(WEB / "assets" / "icons" / "icon-maskable-512.png", optimize=True)

def square(size):
    return master.resize((size, size), Image.Resampling.LANCZOS)

for size in (16, 32, 48, 180, 192, 512):
    out = square(size)
    if size in (192, 512):
        out.save(WEB / "assets" / "icons" / f"icon-{size}.png")
    elif size == 180:
        out.save(WEB / "apple-touch-icon.png")
        out.save(BRANDING / "apple-touch-icon.png")
    else:
        out.save(WEB / f"favicon-{size}x{size}.png")
        out.save(BRANDING / f"favicon-{size}x{size}.png")

master.save(
    WEB / "favicon.ico",
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48)],
)
master.save(
    BRANDING / "favicon.ico",
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48)],
)

densities = {
    "mdpi": 48,
    "hdpi": 72,
    "xhdpi": 96,
    "xxhdpi": 144,
    "xxxhdpi": 192,
}
foreground_sizes = {
    "mdpi": 108,
    "hdpi": 162,
    "xhdpi": 216,
    "xxhdpi": 324,
    "xxxhdpi": 432,
}

def legacy_icon(size, circular=False):
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    inner = max(1, int(size * 0.88))
    icon = master.resize((inner, inner), Image.Resampling.LANCZOS)
    if circular:
        mask = Image.new("L", (inner, inner), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, inner - 1, inner - 1), fill=255)
        icon.putalpha(mask)
    canvas.alpha_composite(icon, ((size-inner)//2, (size-inner)//2))
    return canvas

for density, size in densities.items():
    folder = ANDROID / f"mipmap-{density}"
    legacy_icon(size).save(folder / "ic_launcher.png")
    legacy_icon(size, circular=True).save(folder / "ic_launcher_round.png")

for density, size in foreground_sizes.items():
    folder = ANDROID / f"mipmap-{density}"
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    inner = int(size * 0.70)  # visible adaptive area is 72/108dp
    icon = master.resize((inner, inner), Image.Resampling.LANCZOS)
    offset = ((size - inner) // 2, (size - inner) // 2)
    canvas.alpha_composite(icon, offset)
    canvas.save(folder / "ic_launcher_foreground.png")

splash_sizes = {
    "drawable/splash.png": (480, 320),
    "drawable-land-mdpi/splash.png": (480, 320),
    "drawable-land-hdpi/splash.png": (720, 480),
    "drawable-land-xhdpi/splash.png": (960, 640),
    "drawable-land-xxhdpi/splash.png": (1440, 960),
    "drawable-land-xxxhdpi/splash.png": (1920, 1280),
    "drawable-port-mdpi/splash.png": (320, 480),
    "drawable-port-hdpi/splash.png": (480, 720),
    "drawable-port-xhdpi/splash.png": (640, 960),
    "drawable-port-xxhdpi/splash.png": (960, 1440),
    "drawable-port-xxxhdpi/splash.png": (1280, 1920),
}
for rel, (w, h) in splash_sizes.items():
    splash = ANDROID / rel
    canvas = Image.new("RGBA", (w, h), SPLASH_BG)
    inner = int(min(w, h) * 0.36)
    icon = master.resize((inner, inner), Image.Resampling.LANCZOS)
    canvas.alpha_composite(icon, ((w-inner)//2, (h-inner)//2))
    canvas.convert("RGB").save(splash, format="PNG", optimize=True)

print("master", SOURCE, master.size)
print("branding", BRANDING / "official-icon.png")
