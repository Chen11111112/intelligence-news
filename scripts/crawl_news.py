#!/usr/bin/env python3
"""從 RSS 來源爬取新聞，輸出至 data/news.json 供 Next.js 應用使用。"""

from __future__ import annotations

import hashlib
import json
import os
import re
import sys
from html import unescape
from urllib.parse import unquote, urlparse
from pathlib import Path
from typing import Any

import feedparser
import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)
FETCH_TIMEOUT = 15
OUTPUT = ROOT / "data" / "news.json"
CRAWL_CONFIG = ROOT / "data" / "crawl-config.json"
CONVERSATION_FEEDS = ROOT / "data" / "conversation-feeds.json"
ARTICLES_PER_TOPIC = 8
NEWS_COLLECTION = "news"


def load_env_file(path: Path) -> None:
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def mongo_db_name(uri: str) -> str:
    explicit = os.environ.get("MONGODB_DB", "").strip()
    if explicit:
        return explicit
    path = unquote(urlparse(uri).path or "").strip("/")
    if path:
        return path.split("/")[0]
    return "news_app"


def sync_news_to_db(articles: list[dict[str, Any]]) -> None:
    uri = os.environ.get("MONGODB_URI", "").strip()
    if not uri:
        return

    try:
        from pymongo import MongoClient
    except ImportError:
        print("  !! pymongo not installed; run: npm run crawl:setup", file=sys.stderr)
        return

    try:
        client = MongoClient(uri, serverSelectionTimeoutMS=5000)
        col = client[mongo_db_name(uri)][NEWS_COLLECTION]
        col.delete_many({})
        if articles:
            col.insert_many(articles)
        print(f"  -> Synced {len(articles)} articles to MongoDB")
    except Exception as exc:
        print(f"  !! MongoDB sync failed: {exc}", file=sys.stderr)

def load_conversation_feeds() -> dict[str, dict[str, str]]:
    """slug -> { url, image, topic } from data/conversation-feeds.json"""
    if not CONVERSATION_FEEDS.is_file():
        return {}
    try:
        data = json.loads(CONVERSATION_FEEDS.read_text(encoding="utf-8"))
    except Exception as exc:
        print(f"  !! Invalid conversation-feeds.json: {exc}", file=sys.stderr)
        return {}

    feeds: dict[str, dict[str, str]] = {}
    for tag in data.get("tags", []):
        if not isinstance(tag, dict):
            continue
        slug = tag.get("slug")
        feed_url = tag.get("feedUrl")
        topic = tag.get("topic")
        if isinstance(slug, str) and isinstance(feed_url, str) and isinstance(topic, str):
            feeds[slug] = {
                "url": feed_url,
                "image": tag.get("image", "") if isinstance(tag.get("image"), str) else "",
                "topic": topic,
            }
    return feeds


def default_crawl_slugs(all_feeds: dict[str, dict[str, str]]) -> list[str]:
    if not CONVERSATION_FEEDS.is_file():
        return list(all_feeds.keys())[:2]
    try:
        data = json.loads(CONVERSATION_FEEDS.read_text(encoding="utf-8"))
        slugs = data.get("defaultSlugs", [])
        if isinstance(slugs, list):
            picked = [s for s in slugs if isinstance(s, str) and s in all_feeds]
            if picked:
                return picked
    except Exception:
        pass
    keys = list(all_feeds.keys())
    return keys[:2] if keys else []

LEGACY_TOPIC_TO_SLUG: dict[str, str] = {
    "Economy": "business",
    "Business": "business",
    "Business & Economy": "business",
    "Tech": "technology",
    "Environment": "environment",
    "Fashion": "arts",
}


def resolve_topic_to_slug(topic: str, topic_to_slug: dict[str, str], all_feeds: dict[str, dict[str, str]]) -> str | None:
    if topic in topic_to_slug:
        return topic_to_slug[topic]
    legacy_slug = LEGACY_TOPIC_TO_SLUG.get(topic)
    if legacy_slug and legacy_slug in all_feeds:
        return legacy_slug
    return None


HTML_TAG_RE = re.compile(r"<[^>]+>")


def strip_html(text: str) -> str:
    if not text:
        return ""
    cleaned = HTML_TAG_RE.sub(" ", unescape(text))
    return re.sub(r"\s+", " ", cleaned).strip()


def make_id(link: str, title: str) -> str:
    raw = (link or title).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()[:12]


def estimate_difficulty(text: str) -> str:
    words = len(text.split())
    if words < 45:
        return "Easy"
    if words < 90:
        return "Medium"
    return "Hard"


def estimate_read_time(text: str) -> str:
    words = max(1, len(text.split()))
    minutes = max(1, round(words / 200))
    return f"{minutes} min read"


def get_source_name(url: str) -> str:
    if "theconversation.com" in url:
        return "The Conversation"
    if "bbc.com" in url or "bbci.co.uk" in url:
        return "BBC News"
    if "theguardian.com" in url:
        return "The Guardian"
    try:
        from urllib.parse import urlparse

        host = urlparse(url).netloc.replace("www.", "")
        return host.split(".")[0].title() if host else "External Source"
    except Exception:
        return "External Source"


def extract_paragraphs(soup: BeautifulSoup, url: str) -> list[str]:
    selectors: list[str] = []
    if "theconversation.com" in url:
        selectors = [
            ".content-body p",
            '[itemprop="articleBody"] p',
            ".entry-content p",
            "article p",
        ]
    elif "bbc.com" in url or "bbci.co.uk" in url:
        selectors = [
            '[data-component="text-block"] p',
            "article p",
            '[data-component="article-body"] p',
        ]
    elif "theguardian.com" in url:
        selectors = [
            "#maincontent p",
            ".article-body-viewer-selector p",
            '[data-gu-component="body"] p',
        ]
    else:
        selectors = ["article p", "main p"]

    for selector in selectors:
        nodes = soup.select(selector)
        paragraphs = [
            strip_html(node.get_text(" ", strip=True))
            for node in nodes
            if len(strip_html(node.get_text(" ", strip=True))) > 40
        ]
        if len(paragraphs) >= 2:
            return paragraphs
    return []


def fetch_full_article(url: str) -> tuple[str, str, str, str]:
    """Returns (source_name, full_text, published_at_iso, image_url)."""
    source_name = get_source_name(url)
    published_at = ""
    image_url = ""

    if not url:
        return source_name, "", published_at, image_url

    try:
        response = requests.get(
            url,
            headers={"User-Agent": USER_AGENT},
            timeout=FETCH_TIMEOUT,
        )
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")

        time_tag = soup.find("time")
        if time_tag and time_tag.get("datetime"):
            published_at = time_tag["datetime"]

        image_url = extract_page_image(soup)

        paragraphs = extract_paragraphs(soup, url)
        if paragraphs:
            return source_name, "\n\n".join(paragraphs), published_at, image_url
        if image_url:
            return source_name, "", published_at, image_url
    except Exception as exc:
        print(f"    !! Full article fetch failed: {exc}", file=sys.stderr)

    return source_name, "", published_at, image_url


def upgrade_image_url(url: str) -> str:
    if not url:
        return url
    url = url.strip()
    if "images.unsplash.com" in url:
        base = url.split("?")[0]
        return f"{base}?auto=format&fit=crop&w=1920&q=90"
    if "ichef.bbci.co.uk" in url or "bbci.co.uk" in url or "bbc.co.uk" in url:
        url = re.sub(r"/c\d+x\d+/", "/c1280x720/", url)
        url = re.sub(r"\d{2,4}x\d{2,4}", "1280x720", url)
    if "guim.co.uk" in url or "i.guim.co.uk" in url:
        if "width=" in url:
            url = re.sub(r"width=\d+", "width=1200", url)
        else:
            url += ("&" if "?" in url else "?") + "width=1200&quality=90&dpr=2"
    if "images.theconversation.com" in url or "theconversation.com/files/" in url:
        if "w=" in url:
            url = re.sub(r"w=\d+", "w=1200", url)
        if "q=" in url:
            url = re.sub(r"q=\d+", "q=80", url)
        else:
            url += ("&" if "?" in url else "?") + "q=80"
    if "pbs.twimg.com" in url and "name=" in url:
        url = re.sub(r"name=\w+", "name=large", url)
    return url


def extract_image_from_html(html: str) -> str:
    if not html:
        return ""
    match = re.search(r'src=["\']([^"\']+)["\']', html)
    if not match:
        return ""
    return upgrade_image_url(unescape(match.group(1)))


def extract_page_image(soup: BeautifulSoup) -> str:
    og = soup.find("meta", property="og:image")
    if og and og.get("content"):
        return upgrade_image_url(unescape(og["content"]))
    for selector in ("figure img", ".content-body img", "article img"):
        img = soup.select_one(selector)
        if img and img.get("src"):
            return upgrade_image_url(unescape(img["src"]))
    return ""


def extract_image(entry: Any, fallback: str) -> str:
    if getattr(entry, "media_content", None):
        for media in entry.media_content:
            url = media.get("url")
            if url:
                return upgrade_image_url(unescape(url))
    if getattr(entry, "media_thumbnail", None):
        for thumb in entry.media_thumbnail:
            url = thumb.get("url")
            if url:
                return upgrade_image_url(unescape(url))
    if getattr(entry, "enclosures", None):
        for enc in entry.enclosures:
            if enc.get("type", "").startswith("image") and enc.get("href"):
                return upgrade_image_url(unescape(enc["href"]))
    content = getattr(entry, "content", None)
    if isinstance(content, list):
        for part in content:
            value = part.get("value") if isinstance(part, dict) else getattr(part, "value", "")
            image_url = extract_image_from_html(value or "")
            if image_url:
                return image_url
    summary = getattr(entry, "summary", "") or ""
    image_url = extract_image_from_html(summary)
    if image_url:
        return image_url
    return upgrade_image_url(fallback)


def crawl_tag(tag_slug: str, config: dict[str, str]) -> list[dict[str, Any]]:
    topic = config.get("topic", "Arts + Culture")
    feed = feedparser.parse(config["url"])
    articles: list[dict[str, Any]] = []

    for entry in feed.entries[:ARTICLES_PER_TOPIC]:
        title_en = strip_html(getattr(entry, "title", "") or "Untitled")
        if not title_en:
            continue

        link = getattr(entry, "link", "") or ""
        summary_raw = strip_html(
            getattr(entry, "summary", "")
            or getattr(entry, "description", "")
            or title_en
        )
        description_en = summary_raw
        if len(description_en) > 280:
            description_en = description_en[:277] + "..."

        source_name = get_source_name(link)
        full_content_en = ""
        published_at = ""
        page_image = ""
        feed_image = extract_image(entry, config["image"])

        if link:
            print(f"    Fetching full text: {title_en[:50]}...")
            source_name, full_content_en, published_at, page_image = fetch_full_article(link)

        image_url = page_image or feed_image

        body_for_metrics = full_content_en or summary_raw

        articles.append(
            {
                "id": make_id(link, title_en),
                "topic": topic,
                "tagSlugs": [tag_slug],
                "titleEn": title_en,
                "titleZh": f"【{tag_slug}】{title_en}",
                "descriptionEn": description_en,
                "descriptionZh": "此文為即時爬取的英文新聞，建議搭配 AI 摘要功能深入學習。",
                "readTime": estimate_read_time(body_for_metrics),
                "difficulty": estimate_difficulty(body_for_metrics),
                "imageUrl": image_url,
                "sourceUrl": link,
                "sourceName": source_name,
                "fullContentEn": full_content_en or summary_raw,
                "publishedAt": published_at,
            }
        )

    return articles


def load_crawl_tags() -> dict[str, dict[str, str]]:
    """Read user tag preferences from crawl-config.json (written by Profile save)."""
    all_feeds = load_conversation_feeds()
    if not all_feeds:
        print("  !! Missing conversation-feeds.json", file=sys.stderr)
        return {}

    topic_to_slug = {cfg["topic"]: slug for slug, cfg in all_feeds.items()}

    if CRAWL_CONFIG.is_file():
        try:
            data = json.loads(CRAWL_CONFIG.read_text(encoding="utf-8"))
            tags = data.get("tags", [])
            if isinstance(tags, list) and tags:
                selected = {
                    slug: all_feeds[slug]
                    for slug in tags
                    if isinstance(slug, str) and slug in all_feeds
                }
                if selected:
                    print(f"Crawl config tags: {', '.join(selected.keys())}")
                    return selected
            topics = data.get("topics", [])
            if isinstance(topics, list) and topics:
                slugs = [
                    slug
                    for t in topics
                    if isinstance(t, str)
                    for slug in [resolve_topic_to_slug(t, topic_to_slug, all_feeds)]
                    if slug
                ]
                selected = {s: all_feeds[s] for s in slugs if s in all_feeds}
                if selected:
                    print(f"Crawl config (legacy topics): {', '.join(selected.keys())}")
                    return selected
        except Exception as exc:
            print(f"  !! Invalid crawl-config.json: {exc}", file=sys.stderr)

    defaults = default_crawl_slugs(all_feeds)
    selected = {s: all_feeds[s] for s in defaults if s in all_feeds}
    print(f"Default crawl tags: {', '.join(selected.keys())}")
    return selected


def main() -> int:
    load_env_file(ROOT / ".env.local")
    load_env_file(ROOT / ".env")

    all_articles: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    feeds = load_crawl_tags()

    for tag_slug, config in feeds.items():
        print(f"Fetching tag [{tag_slug}]...")
        try:
            articles = crawl_tag(tag_slug, config)
            new_articles = []
            for a in articles:
                if a["id"] not in seen_ids:
                    seen_ids.add(a["id"])
                    new_articles.append(a)
                else:
                    # 合併 tagSlugs 到既有文章（若重複）
                    for existing in all_articles:
                        if existing["id"] == a["id"]:
                            existing.setdefault("tagSlugs", [])
                            if tag_slug not in existing["tagSlugs"]:
                                existing["tagSlugs"].append(tag_slug)
                            break
            print(f"  -> {len(new_articles)} new articles")
            all_articles.extend(new_articles)
        except Exception as exc:  # noqa: BLE001
            print(f"  !! Failed: {exc}", file=sys.stderr)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("w", encoding="utf-8") as f:
        json.dump(all_articles, f, ensure_ascii=False, indent=2)

    sync_news_to_db(all_articles)

    print(f"\nWrote {len(all_articles)} articles to {OUTPUT}")
    return 0 if all_articles else 1


if __name__ == "__main__":
    raise SystemExit(main())
