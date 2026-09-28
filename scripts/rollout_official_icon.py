from pathlib import Path
from PIL import Image

ROOT = Path(r"C:\Projects\IslamTimeWorldBot")
WEB = ROOT / "webapp"
ANDROID = ROOT / "android" / "app" / "src" / "main" / "res"
SOURCE = WEB / "assets" / "icons" / "icon-512.png"
BRANDING = WEB / "assets" / "branding"
BRANDING.mkdir(parents=True, exist_ok=True)

master = Image.open(SOURCE).convert("RGBA")
bg = master.getpixel((0, 0))
master.save(BRANDING / "official-icon.png")

def square(size):
    return master.resize((size, size), Image.Resampling.LANCZOS)

for size in (16, 32, 48, 180, 192, 512):
    out = square(size)
    if size in (192, 512):
        out.save(WEB / "assets" / "icons" / f"icon-{size}.png")
    elif size == 180:
        out.save(WEB / "apple-touch-icon.png")
    else:
        out.save(WEB / f"favicon-{size}x{size}.png")

master.save(
    WEB / "favicon.ico",
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

for density, size in densities.items():
    folder = ANDROID / f"mipmap-{density}"
    square(size).save(folder / "ic_launcher.png")
    square(size).save(folder / "ic_launcher_round.png")

for density, size in foreground_sizes.items():
    folder = ANDROID / f"mipmap-{density}"
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    inner = int(size * 0.78)
    icon = master.resize((inner, inner), Image.Resampling.LANCZOS)
    offset = ((size - inner) // 2, (size - inner) // 2)
    canvas.alpha_composite(icon, offset)
    canvas.save(folder / "ic_launcher_foreground.png")

for splash in ANDROID.rglob("splash.png"):
    old = Image.open(splash)
    w, h = old.size
    canvas = Image.new("RGBA", (w, h), bg)
    inner = int(min(w, h) * 0.36)
    icon = master.resize((inner, inner), Image.Resampling.LANCZOS)
    canvas.alpha_composite(icon, ((w-inner)//2, (h-inner)//2))
    canvas.convert("RGB").save(splash, format="PNG", optimize=True)

print("master", SOURCE, master.size, "bg", bg)
print("branding", BRANDING / "official-icon.png")
