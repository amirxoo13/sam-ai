#!/usr/bin/env python3
"""Clean qavanin.ir TreeText crawls into article-sized chunks.

Drops ArvanCloud «Loading» empties, listing chrome, and HTTP 400 runtime errors.
Body starts after the TreeText toolbar (قلم یکان …) and ends before تنقیح chrome.
"""
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ATTACH = ROOT / "attachments"
OUT = ROOT / "src/data/qavanin-selected.json"
META = ROOT / "src/data/qavanin-meta"
RETRY = ROOT / "apify-inputs/04-qavanin-retry-arvan.input.json"
NEXT = ROOT / "apify-inputs/05-qavanin-pages-103-202.input.json"

SOURCES = [
    ATTACH / "dataset_website-content-crawler_2026-09-05_13-14-07-684.json",
    ATTACH / "dataset_website-content-crawler_2026-09-05_16-56-27-925.json",
]

FA = "۰۱۲۳۴۵۶۷۸۹"
FONT_MARK = "قلم یکان ایران میترا ترافیک زر یاقوت تیتر"
TAIL_RE = re.compile(r"[×xX]?\s*###?\s*وضعیت های تنقیحی")
ART_SPLIT = re.compile(
    r"(?=ماده\s*(?:واحده|[0-9۰-۹]{1,4}(?:\s*مکرر)?)\\?[.\-–—ـ:\s])"
)
ART_NUM = re.compile(r"ماده\s*(واحده|[0-9۰-۹]{1,4}(?:\s*مکرر)?)")
DATE_ONLY = re.compile(
    r"(?:مصوب|تاریخ(?:\s*(?:تنظیم|دادنامه|تصویب))?)\s*[:：]?\s*"
    r"((?:13|14|۱۳|۱۴)[0-9۰-۹]{2}(?:[\/\-٬,،.][0-9۰-۹]{1,2}){0,2})"
)
MD_IMG = re.compile(r"!\[[^\]]*\]\([^)]*\)")
MD_LINK = re.compile(r"\[([^\]]*)\]\([^)]*\)")
MD_TABLE_ROW = re.compile(r"^\s*\|.*\|\s*$", re.M)
HTML_BR = re.compile(r"<br\s*/?>", re.I)
LISTING_MARKERS = (
    "توصیف جستجو",
    "تعداد یافته ها",
    "فهرستهای کاربردی",
    "Loading more results",
)

CAP_STATUTE = 6
CAP_RULING = 3
MAX_CHUNK = 1650
MIN_BODY = 280
MIN_CHUNK = 220
TARGET_MAX = 4200

KIND_RANK = {
    "قانون": 0,
    "آیین‌نامه": 1,
    "رأی": 2,
    "اساسنامه": 3,
    "دستورالعمل": 4,
    "تصویب‌نامه": 5,
    "مصوبه": 6,
    "بخشنامه": 7,
    "سایر": 8,
}


def to_en(s: str) -> str:
    return "".join(str(FA.index(ch)) if ch in FA else ch for ch in s)


def norm_date(raw: str | None) -> str | None:
    if not raw:
        return None
    s = to_en(raw).replace(",", "/").replace("،", "/").replace("-", "/").replace(".", "/")
    s = re.sub(r"/{2,}", "/", s).strip("/")
    return s or None


def fa_ratio(text: str) -> float:
    if not text:
        return 0.0
    fa = sum(1 for ch in text if "\u0600" <= ch <= "\u06FF")
    return fa / max(len(text), 1)


def classify(title: str) -> str:
    t = title or ""
    if t.startswith("قانون") or t.startswith("قانون‌"):
        return "قانون"
    if t.startswith("آيين") or t.startswith("آیین") or "آيين‌نامه" in t[:40] or "آیین‌نامه" in t[:40]:
        return "آیین‌نامه"
    if any(
        x in t[:48]
        for x in (
            "دادنامه",
            "رأي",
            "رای",
            "هيأت عمومي",
            "هیئت عمومی",
            "هيئت تخصصي",
            "دیوان عدالت",
            "ديوان عدالت",
        )
    ):
        return "رأی"
    if "اساسنامه" in t[:48]:
        return "اساسنامه"
    if t.startswith("دستورالعمل") or "دستورالعمل" in t[:36]:
        return "دستورالعمل"
    if t.startswith("تصويب") or t.startswith("تصویب") or "تصويب نامه" in t[:40]:
        return "تصویب‌نامه"
    if t.startswith("مصوبه") or "مصوبه" in t[:24]:
        return "مصوبه"
    if t.startswith("بخشنامه") or "بخشنامه" in t[:30]:
        return "بخشنامه"
    return "سایر"


def source_type_for(kind: str) -> str:
    return "case_law" if kind == "رأی" else "statute"


def rec_url(rec: dict) -> str:
    return rec.get("url") or (rec.get("crawl") or {}).get("loadedUrl") or ""


def rec_title(rec: dict) -> str:
    return ((rec.get("metadata") or {}).get("title") or "").strip()


def rec_body(rec: dict) -> str:
    md = rec.get("markdown") or ""
    tx = rec.get("text") or ""
    return md if len(md) >= len(tx) else tx


def ids_of(url: str) -> str | None:
    m = re.search(r"IDS=(\d+)", url)
    return m.group(1) if m else None


def clean_body(raw: str) -> str:
    text = raw or ""
    m = TAIL_RE.search(text)
    if m:
        text = text[: m.start()]
    i = text.find(FONT_MARK)
    if i >= 0:
        text = text[i + len(FONT_MARK) :]
    else:
        i = text.find("راهنمای رنگ بندی")
        if i >= 0:
            text = text[i:]
            j = text.find("تیتر")
            text = text[j + 4 :] if j >= 0 else text
    text = HTML_BR.sub("\n", text)
    text = MD_IMG.sub("", text)
    text = MD_LINK.sub(r"\1", text)
    text = MD_TABLE_ROW.sub("", text)
    text = re.sub(r"^#+\s*", "", text, flags=re.M)
    text = text.replace("**", "").replace("__", "")
    text = re.sub(r"^[\s|]+$", "", text, flags=re.M)
    text = text.replace("\\-", "-").replace("\\.", ".")
    text = re.sub(r"&nbsp;", " ", text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip(" \n\t|")


def split_articles(text: str) -> list[tuple[str | None, str]]:
    parts = [p.strip(" \n\t|") for p in ART_SPLIT.split(text) if p.strip(" \n\t|")]
    if len(parts) <= 1:
        return [(None, text)]
    out: list[tuple[str | None, str]] = []
    preamble = parts[0]
    if not ART_NUM.match(preamble) and len(preamble) > 40:
        out.append((None, preamble))
        rest = parts[1:]
    else:
        rest = parts
    for p in rest:
        m = ART_NUM.match(p)
        num = to_en(m.group(1)) if m else None
        out.append((num, p))
    return out or [(None, text)]


def pack_chunks(
    pieces: list[tuple[str | None, str]], title: str, kind: str
) -> list[tuple[str | None, str]]:
    chunks: list[tuple[str | None, str]] = []
    for num, body in pieces:
        body = body.strip(" \n\t|")
        if len(body) <= MAX_CHUNK:
            chunks.append((num, body))
            continue
        paras = re.split(r"\n{2,}", body)
        buf: list[str] = []
        n = 0
        part = 0
        for para in paras:
            if n + len(para) + 2 > MAX_CHUNK and buf:
                label = f"{num}/{part}" if num else None
                chunks.append((label, "\n\n".join(buf)))
                buf = [para]
                n = len(para)
                part += 1
            else:
                buf.append(para)
                n += len(para) + 2
        if buf:
            label = f"{num}/{part}" if num and part else num
            chunks.append((label, "\n\n".join(buf)))

    labeled = []
    for num, body in chunks:
        body = body.strip(" \n\t|")
        if len(body) < MIN_CHUNK:
            continue
        if title and title not in body[:160]:
            body = f"{title}\n\n{body}"
        labeled.append((num, body.strip()))

    cap = CAP_RULING if kind == "رأی" else CAP_STATUTE
    if len(labeled) > cap:
        if kind == "رأی" and cap >= 2:
            labeled = [labeled[0], *labeled[-(cap - 1) :]]
        else:
            labeled = labeled[:cap]
    return labeled


def heading_date(*texts: str) -> str | None:
    for text in texts:
        if not text:
            continue
        m = DATE_ONLY.search(text[:2500])
        if m:
            return norm_date(m.group(1))
    return None


def heading_title(raw: str, fallback: str) -> str:
    m = re.search(r"^#\s+(.+)$", raw, re.M)
    if m:
        t = m.group(1).strip()
        t = re.sub(r"\s+با اصلاحات و الحاقات بعدی\s*$", "", t)
        if 8 < len(t) < 240:
            return t
    t = re.sub(r"\s+با اصلاحات و الحاقات بعدی\s*$", "", fallback).strip()
    return t[:220]


def load_records() -> list[dict]:
    rows = []
    for path in SOURCES:
        if not path.exists():
            continue
        with path.open(encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            rows.extend(data)
    return rows


def apify_base(start_urls: list[dict], *, depth: int, pages: int, wait: int) -> dict:
    return {
        "crawlerType": "playwright:firefox",
        "keepUrlFragments": False,
        "respectRobotsTxtFile": False,
        "useSitemaps": False,
        "htmlTransformer": "none",
        "saveMarkdown": True,
        "saveHtml": False,
        "saveFiles": False,
        "saveScreenshots": False,
        "removeCookieWarnings": True,
        "aggressivePrune": False,
        "maxConcurrency": 2,
        "initialConcurrency": 1,
        "maxRequestRetries": 10,
        "maxSessionRotations": 5,
        "ignoreSslErrors": True,
        "ignoreHttpsErrors": True,
        "removeElementsCssSelector": (
            "nav, footer, header, aside, iframe, script, style, noscript, svg, "
            ".menu, .navbar, .cookie, #cookie, .captcha, .k-pager-nav, #CommentBox, "
            ".comment, .comments, .error-section"
        ),
        "proxyConfiguration": {
            "useApifyProxy": False,
            "proxyUrls": ["http://USER:PASS@HOST:PORT"],
        },
        "customHttpHeaders": {"Accept-Language": "fa-IR,fa;q=0.9,en;q=0.8"},
        "excludeUrlGlobs": [
            {"glob": "**/*login*"},
            {"glob": "**/*Login*"},
            {"glob": "**/*captcha*"},
            {"glob": "**/Account/**"},
            {"glob": "**/*.css"},
            {"glob": "**/*.js"},
            {"glob": "**/*.png"},
            {"glob": "**/*.jpg"},
            {"glob": "**/*.pdf"},
            {"glob": "**/Phrase/**"},
            {"glob": "**/*RelatedIndex*"},
            {"glob": "**/*SubjectIndex*"},
            {"glob": "**/*StatusIndex*"},
            {"glob": "**/*ImageText*"},
            {"glob": "**/*Attribute*"},
        ],
        "startUrls": start_urls,
        "includeUrlGlobs": [
            {"glob": "https://qavanin.ir/Law?page=*"},
            {"glob": "https://qavanin.ir/Law/TreeText*"},
            {"glob": "https://qavanin.ir/Law/TreeText/**"},
        ],
        "maxCrawlPages": pages,
        "maxCrawlDepth": depth,
        "dynamicContentWaitSecs": wait,
        "maxScrollHeightPixels": 25000,
        "requestHandlerTimeoutSecs": 150,
        "navigationTimeoutSecs": 90,
        "clickElementsCssSelector": "",
    }


def main() -> None:
    records = load_records()
    by_id: dict[str, dict] = {}
    skipped = Counter()
    retry_urls: list[str] = []
    listing_pages = set()

    for rec in records:
        url = rec_url(rec)
        title = rec_title(rec)
        body = rec_body(rec)
        status = (rec.get("crawl") or {}).get("httpStatusCode")
        if "page=" in url and "TreeText" not in url:
            skipped["listing"] += 1
            try:
                listing_pages.add(int(url.split("page=")[-1].split("&")[0]))
            except ValueError:
                pass
            continue
        if "TreeText" not in url:
            skipped["not_treetext"] += 1
            continue
        ids = ids_of(url)
        if not ids:
            skipped["no_ids"] += 1
            continue
        if status and status >= 400:
            skipped["http_error"] += 1
            retry_urls.append(url.split("#")[0])
            continue
        if not body.strip() or title.lower().startswith("loading") or "Transferring" in title:
            skipped["arvan_empty"] += 1
            retry_urls.append(url.split("#")[0])
            continue
        if any(m in body for m in LISTING_MARKERS):
            skipped["listing_chrome"] += 1
            continue
        prev = by_id.get(ids)
        if prev is None or len(rec_body(prev)) < len(body):
            by_id[ids] = rec

    docs = []
    kind_docs = Counter()
    for ids, rec in by_id.items():
        raw = rec_body(rec)
        title = heading_title(raw, rec_title(rec))
        kind = classify(title)
        cleaned = clean_body(raw)
        if len(cleaned) < MIN_BODY or fa_ratio(cleaned) < 0.35:
            skipped["too_short_or_latin"] += 1
            continue
        date = heading_date(raw, cleaned, title)
        pieces = split_articles(cleaned)
        chunks = pack_chunks(pieces, title, kind)
        if not chunks:
            skipped["no_chunks"] += 1
            continue
        kind_docs[kind] += 1
        docs.append(
            {
                "ids": ids,
                "title": title,
                "kind": kind,
                "date": date,
                "url": rec_url(rec).split("#")[0],
                "rank": KIND_RANK.get(kind, 9),
                "n_chunks": len(chunks),
                "chars": sum(len(c[1]) for c in chunks),
                "chunks": chunks,
            }
        )

    docs.sort(key=lambda d: (d["rank"], -d["chars"]))
    selected_docs: list[dict] = []
    total_chunks = 0
    dropped_cap = 0
    for d in docs:
        if total_chunks >= TARGET_MAX and d["rank"] >= KIND_RANK["تصویب‌نامه"]:
            dropped_cap += 1
            continue
        selected_docs.append(d)
        total_chunks += d["n_chunks"]

    out_chunks = []
    by_kind = Counter()
    dated = 0
    for d in selected_docs:
        by_kind[d["kind"]] += 1
        if d["date"]:
            dated += 1
        for i, (art, content) in enumerate(d["chunks"]):
            out_chunks.append(
                {
                    "id": f"qavanin-{d['ids']}-{i}",
                    "content": content,
                    "source_type": source_type_for(d["kind"]),
                    "source_title": d["title"],
                    "article_number": art,
                    "law_date": d["date"],
                    "source_url": d["url"],
                    "source_id": d["ids"],
                    "hf_dataset": "qavanin.ir",
                    "_kind": d["kind"],
                }
            )

    META.mkdir(parents=True, exist_ok=True)
    report = {
        "source": "Apify website-content-crawler of qavanin.ir TreeText (pages 1–5 smoke + 3–102 full).",
        "why": "Official National Laws portal. Listing chrome and ArvanCloud HTTP-200 empties dropped. Body clipped between toolbar and تنقیح chrome.",
        "raw_records": len(records),
        "unique_treetext": len(by_id),
        "selected_docs": len(selected_docs),
        "total_chunks": len(out_chunks),
        "dated_docs": dated,
        "skipped": dict(skipped),
        "by_kind_docs": dict(kind_docs),
        "by_kind_kept": dict(by_kind),
        "dropped_for_cap": dropped_cap,
        "listing_pages": {
            "n": len(listing_pages),
            "min": min(listing_pages) if listing_pages else None,
            "max": max(listing_pages) if listing_pages else None,
        },
        "retry_urls": len(set(retry_urls)),
        "sample_titles": [d["title"][:120] for d in selected_docs[:12]],
    }
    OUT.write_text(
        json.dumps(
            {
                "source": report["source"],
                "why": report["why"],
                "total_selected": len(out_chunks),
                "docs": len(selected_docs),
                "skipped": report["skipped"],
                "by_kind": report["by_kind_kept"],
                "chunks": out_chunks,
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    (META / "selection-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    uniq_retry = sorted(set(retry_urls))
    retry_payload = apify_base(
        [{"url": u} for u in uniq_retry],
        depth=0,
        pages=max(len(uniq_retry) + 10, 50),
        wait=28,
    )
    RETRY.write_text(json.dumps(retry_payload, ensure_ascii=False, indent=2), encoding="utf-8")

    next_urls = [{"url": f"https://qavanin.ir/Law?page={n}"} for n in range(103, 203)]
    next_payload = apify_base(next_urls, depth=1, pages=3000, wait=25)
    NEXT.write_text(json.dumps(next_payload, ensure_ascii=False, indent=2), encoding="utf-8")

    print(
        json.dumps(
            {
                "wrote": str(OUT),
                "chunks": len(out_chunks),
                "docs": len(selected_docs),
                "dated": dated,
                "skipped": dict(skipped),
                "by_kind": dict(by_kind),
                "retry": len(uniq_retry),
                "bytes": OUT.stat().st_size,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
