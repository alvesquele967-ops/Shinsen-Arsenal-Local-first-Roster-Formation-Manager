import importlib.util
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


builder = load_module("build_shinsen_data", ROOT / "script" / "build_shinsen_data.py")
checker = load_module("check_shinsen_data", ROOT / "script" / "check_shinsen_data.py")


def test_stable_hash_normalizes_full_width_characters():
    assert builder.stable_hash("skill", "ＡＢＣ") == builder.stable_hash("skill", "ABC")
    assert builder.stable_hash("skill", "ABC").startswith("skill-")


def test_kana_correction_is_deterministic():
    assert builder.kana_of("織田信長") == "おだのぶなが"


def test_generated_catalog_integrity_and_version_match():
    data = ROOT / "src" / "shinsen" / "data"
    heroes = json.loads((data / "heroes.json").read_text("utf-8"))
    skills = json.loads((data / "skills.json").read_text("utf-8"))
    meta = json.loads((data / "meta.json").read_text("utf-8"))
    public_version = json.loads((ROOT / "public" / "data-version.json").read_text("utf-8"))
    assert len(heroes) == meta["heroCount"] >= 140
    assert len(skills) == meta["skillCount"] >= 200
    assert public_version["databaseVersion"] == meta["databaseVersion"]
    assert len({hero["id"] for hero in heroes}) == len(heroes)
    assert len({hero["name"] for hero in heroes}) == len(heroes)
    assert all(hero["portrait"].startswith("https://") for hero in heroes)
    assert checker.main() == 0


def test_weapon_art_unlock_matches_trait():
    heroes = json.loads((ROOT / "src" / "shinsen" / "data" / "heroes.json").read_text("utf-8"))
    artillery = [hero for hero in heroes if hero["weaponArt"]]
    assert artillery
    for hero in artillery:
        matching = [trait for trait in hero["traits"] if trait["name"] == hero["weaponArt"]["name"]]
        assert len(matching) == 1
        assert matching[0]["unlockBreakthrough"] == hero["weaponArt"]["unlockBreakthrough"]
