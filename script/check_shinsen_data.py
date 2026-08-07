"""公開武将データの完全性を検査し、異常時は非 0 で終了する。"""

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "src" / "shinsen" / "data"


def main() -> int:
    heroes = json.loads((DATA / "heroes.json").read_text("utf-8"))
    skills = json.loads((DATA / "skills.json").read_text("utf-8"))
    problems: list[str] = []
    for field in ("id", "name"):
        counts = Counter(hero[field] for hero in heroes)
        dup = [value for value, count in counts.items() if count > 1]
        if dup:
            problems.append(f"重複武将 {field}: {', '.join(dup[:5])}")
    required = ("id", "name", "nameKana", "rarity", "faction", "cost", "portrait", "sourceUrl")
    for hero in heroes:
        for field in required:
            if hero.get(field) in (None, "", 0):
                problems.append(f"{hero.get('name', '?')}: {field} がありません")
        if hero.get("rarity") not in (3, 4, 5):
            problems.append(f"{hero['name']}: 稀有度が不正です")
        if any(not isinstance(value, int) or value <= 0 for value in hero.get("stats", {}).values()):
            problems.append(f"{hero['name']}: 能力値が不正です")
        art = hero.get("weaponArt")
        if art and (art.get("level") not in (1, 2, 3) or art.get("unlockBreakthrough") not in range(6)):
            problems.append(f"{hero['name']}: 器術データが不正です")
    skill_names = {skill["name"] for skill in skills}
    for hero in heroes:
        if hero.get("uniqueSkill") and hero["uniqueSkill"] not in skill_names:
            problems.append(f"{hero['name']}: 固有戦法の参照先がありません ({hero['uniqueSkill']})")
    if len(heroes) < 140:
        problems.append(f"武将数が少なすぎます: {len(heroes)}")
    if sum(hero["rarity"] == 5 for hero in heroes) < 80:
        problems.append("★5 武将の収録数が不足しています")
    if problems:
        print("[data:check] NG")
        for problem in problems[:50]: print(f"- {problem}")
        return 1
    print(f"[data:check] OK: {len(heroes)} heroes, {len(skills)} skills, missing portraits=0")
    return 0


if __name__ == "__main__":
    sys.exit(main())
