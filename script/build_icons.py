"""PWA 用の単純なコードネイティブ PNG アイコンを生成する。"""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
FONT_CANDIDATES = [
    Path("C:/Windows/Fonts/yumin.ttf"),
    Path("C:/Windows/Fonts/YuGothB.ttc"),
    Path("C:/Windows/Fonts/meiryo.ttc"),
]


def build(size: int, name: str) -> None:
    image = Image.new("RGB", (size, size), "#101816")
    draw = ImageDraw.Draw(image)
    margin = max(4, size // 18)
    width = max(2, size // 70)
    draw.rectangle((margin, margin, size - margin - 1, size - margin - 1), outline="#C9AD6E", width=width)
    diamond = [(size // 2, size // 8), (size * 7 // 8, size // 2), (size // 2, size * 7 // 8), (size // 8, size // 2)]
    draw.line(diamond + [diamond[0]], fill="#6F613F", width=width)
    font_path = next((path for path in FONT_CANDIDATES if path.exists()), None)
    font = ImageFont.truetype(str(font_path), size * 11 // 20) if font_path else ImageFont.load_default()
    box = draw.textbbox((0, 0), "真", font=font)
    x = (size - (box[2] - box[0])) // 2
    y = (size - (box[3] - box[1])) // 2 - box[1]
    draw.text((x, y), "真", font=font, fill="#F7F3E9")
    image.save(PUBLIC / name, optimize=True)


def optimize_social_card() -> None:
    """生成済みの OG カードを標準の 1200x630 に縮小して軽量化する。"""
    path = PUBLIC / "og.png"
    if not path.exists():
        return
    with Image.open(path) as source:
        source.convert("RGB").resize((1200, 630), Image.Resampling.LANCZOS).save(path, optimize=True)


if __name__ == "__main__":
    PUBLIC.mkdir(exist_ok=True)
    build(64, "favicon.png")
    build(192, "icon-192.png")
    build(512, "icon-512.png")
    optimize_social_card()
    print("[icons] favicon.png / icon-192.png / icon-512.png / og.png")
