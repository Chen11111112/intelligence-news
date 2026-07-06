from __future__ import annotations

import os
import subprocess
import sys
import time
from pathlib import Path

INTERVAL_SECONDS = int(os.environ.get("CRAWL_INTERVAL_SECONDS", "3600"))
ROOT = Path(__file__).resolve().parent.parent
CRAWL_SCRIPT = ROOT / "scripts" / "crawl_news.py"


def run_crawl() -> int:
    print(f"\n--- Running crawl at {time.strftime('%Y-%m-%d %H:%M:%S')} ---")
    result = subprocess.run([sys.executable, str(CRAWL_SCRIPT)], cwd=ROOT)
    return result.returncode


def main() -> int:
    print(f"Crawl scheduler started. Interval: {INTERVAL_SECONDS}s")
    while True:
        code = run_crawl()
        if code != 0:
            print(f"Crawl exited with code {code}", file=sys.stderr)
        print(f"Next crawl in {INTERVAL_SECONDS} seconds...")
        time.sleep(INTERVAL_SECONDS)


if __name__ == "__main__":
    raise SystemExit(main())
