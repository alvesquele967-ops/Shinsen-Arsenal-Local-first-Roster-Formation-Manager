"""現在の公開データ生成で利用するパス定義。"""

from pathlib import Path

DATA_DIR = Path("data")
CRAWL_CACHE_DIR = DATA_DIR / ".crawl_cache"
CFG_HISTORY_DIR = DATA_DIR / ".cfg_history"

HEROES_CRAWLED = DATA_DIR / "heroes_crawled.yaml"
SKILLS_CRAWLED = DATA_DIR / "skills_crawled.yaml"
TRAITS_CRAWLED = DATA_DIR / "traits_crawled.yaml"
ASSEMBLY_CRAWLED = DATA_DIR / "assembly_skills_crawled.yaml"
BINGXUE_CRAWLED = DATA_DIR / "bingxue_crawled.yaml"

SKILLS_CANONICAL = DATA_DIR / "skills.yaml"
TRAITS_CANONICAL = DATA_DIR / "traits.yaml"
BINGXUE_CANONICAL = DATA_DIR / "bingxue.yaml"
