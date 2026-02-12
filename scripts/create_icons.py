from pathlib import Path
from PIL import Image, ImageDraw

def draw_mark(image_size, bg, circle):
    img = Image.new("RGBA", (image_size, image_size), bg)
    draw = ImageDraw.Draw(img)
    padding = image_size // 8
    bounds = [padding, padding, image_size - padding, image_size - padding]
    draw.ellipse(bounds, fill=circle)
    return img

folder = Path("public/brand")
folder.mkdir(parents=True, exist_ok=True)

bg = (15, 23, 42, 255)
circle = (14, 165, 233, 255)

for name, size in [("logo.png", 256), ("logo-192.png", 192), ("logo-512.png", 512), ("apple-touch-icon.png", 180)]:
    draw_mark(size, bg, circle).save(folder / name)

base = draw_mark(128, bg, circle)
base.save(folder / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128)])
