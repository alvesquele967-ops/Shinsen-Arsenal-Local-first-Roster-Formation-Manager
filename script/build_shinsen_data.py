"""公開の日本語ソースからフロントエンド用データを生成する。"""

from __future__ import annotations

import gzip
import hashlib
import html
import json
import re
import unicodedata
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
OUTPUT = ROOT / "src" / "shinsen" / "data"
TYPE_JA = {"被動": "受動", "主動": "能動", "指揮": "指揮", "突擊": "突撃", "兵種": "兵種", "陣法": "陣法"}
ROMAN_LEVEL = {"Ⅰ": 1, "Ⅱ": 2, "Ⅲ": 3}
UNLOCK_BY_TRAIT_INDEX = (0, 1, 2, 4)
KANA_CORRECTIONS = {
    "織田信長": "おだのぶなが", "豊臣秀吉": "とよとみひでよし", "徳川家康": "とくがわいえやす",
    "武田信玄": "たけだしんげん", "上杉謙信": "うえすぎけんしん", "明智光秀": "あけちみつひで",
    "黒田官兵衛": "くろだかんべえ", "真田幸村": "さなだゆきむら", "小山田信茂": "おやまだのぶしげ",
    "諏訪姫": "すわひめ", "蜂須賀小六": "はちすかころく",
}


def stable_hash(prefix: str, value: str) -> str:
    digest = hashlib.sha1(unicodedata.normalize("NFKC", value).encode("utf-8")).hexdigest()[:10]
    return f"{prefix}-{digest}"


def kana_of(name: str) -> str:
    if name in KANA_CORRECTIONS:
        return KANA_CORRECTIONS[name]
    try:
        from pykakasi import kakasi
        return "".join(item["hira"] for item in kakasi().convert(name))
    except ImportError:
        return name


def load_cfg_ids() -> dict[str, int]:
    snapshots = sorted((DATA / ".cfg_history").glob("*.json.gz"))
    if not snapshots:
        return {}
    with gzip.open(snapshots[-1], "rt", encoding="utf-8") as handle:
        cfg = json.load(handle)
    ja_by_source = {entry.get("id"): entry.get("ja") for entry in cfg.get("multi_lang", [])}
    return {
        ja_by_source.get(hero.get("name")): int(hero["id"])
        for hero in cfg.get("hero", [])
        if ja_by_source.get(hero.get("name")) and hero.get("id") is not None
    }


def build() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    heroes_raw = yaml.safe_load((DATA / "heroes_crawled.yaml").read_text("utf-8")) or []
    skills_raw = yaml.safe_load((DATA / "skills_crawled.yaml").read_text("utf-8")) or {}
    cfg_ids = load_cfg_ids()
    heroes = []
    for raw in heroes_raw:
        detail_match = re.search(r"/(\d+)$", raw.get("detail_url") or "")
        fallback_id = detail_match.group(1) if detail_match else stable_hash("game8", raw["name"])
        hero_id = f"hero-{cfg_ids[raw['name']]}" if raw["name"] in cfg_ids else f"hero-g8-{fallback_id}"
        traits, weapon_art = [], None
        for index, trait in enumerate(raw.get("traits") or []):
            unlock = UNLOCK_BY_TRAIT_INDEX[min(index, len(UNLOCK_BY_TRAIT_INDEX) - 1)]
            item = {"name": html.unescape(trait.get("name") or ""), "description": html.unescape(trait.get("description") or ""), "unlockBreakthrough": unlock}
            traits.append(item)
            match = re.fullmatch(r"器術([ⅠⅡⅢ])", item["name"])
            if match:
                weapon_art = {"name": item["name"], "level": ROMAN_LEVEL[match.group(1)], "unlockBreakthrough": unlock}
        stats = raw.get("stats") or {}
        heroes.append({
            "id": hero_id, "name": raw["name"], "nameKana": kana_of(raw["name"]),
            "rarity": int(raw.get("rarity") or 0), "faction": raw.get("faction") or "その他", "clan": raw.get("clan") or "",
            "cost": int(raw.get("cost") or 0), "portrait": raw.get("portrait") or "",
            "stats": {"valor": int(stats.get("val") or 0), "leadership": int(stats.get("lea") or 0), "intelligence": int(stats.get("int") or 0), "politics": int(stats.get("pol") or 0), "speed": int(stats.get("spd") or 0)},
            "uniqueSkill": raw.get("unique_skill") or "", "teachableSkill": raw.get("teachable_skill") or None, "assemblySkill": raw.get("assembly_skill") or None,
            "traits": traits, "weaponArt": weapon_art, "sourceUrl": raw.get("detail_url") or "", "updatedAt": "2026-08-07",
        })
    skills = [{
        "id": stable_hash("skill", name), "name": name, "nameKana": kana_of(name), "rarity": raw.get("rarity") or "",
        "type": TYPE_JA.get(raw.get("type"), raw.get("type") or "不明"), "target": raw.get("target") or "", "activationRate": raw.get("activation_rate") or "",
        "description": html.unescape(raw.get("description") or ""), "sourceHero": raw.get("source_hero") or None,
    } for name, raw in skills_raw.items()]
    heroes.sort(key=lambda item: (-item["rarity"], -item["cost"], item["nameKana"]))
    skills.sort(key=lambda item: (item["rarity"], item["nameKana"]), reverse=True)
    payload = json.dumps(heroes, ensure_ascii=False, separators=(",", ":"))
    version = f"2026.08.07-{hashlib.sha256(payload.encode('utf-8')).hexdigest()[:10]}"
    (OUTPUT / "heroes.json").write_text(payload + "\n", "utf-8")
    (OUTPUT / "skills.json").write_text(json.dumps(skills, ensure_ascii=False, separators=(",", ":")) + "\n", "utf-8")
    (OUTPUT / "meta.json").write_text(json.dumps({
        "databaseVersion": version, "updatedAt": "2026-08-07", "heroCount": len(heroes), "skillCount": len(skills),
        "sources": [{"name": "Game8 信長の野望 真戦", "url": "https://game8.jp/nobunaga-shinsen/737773"}, {"name": "Shinsei-Lineup cfg snapshot", "url": "https://github.com/davidjaw/Shinsei-Lineup"}],
    }, ensure_ascii=False, indent=2) + "\n", "utf-8")
    (ROOT / "public" / "data-version.json").write_text(json.dumps({
        "databaseVersion": version, "updatedAt": "2026-08-07", "heroCount": len(heroes), "skillCount": len(skills),
    }, ensure_ascii=False, indent=2) + "\n", "utf-8")
    print(f"[data] {len(heroes)} heroes / {len(skills)} skills -> {version}")


if __name__ == "__main__":
    build()
