#!/usr/bin/env python3
"""Ingest complete core Iranian codes from the user-provided db07 xlsx.

Sampling was leaving daily-use codes half-empty (e.g. 91/1089 of قانون مدنی).
FULL_TITLES take every usable article. CAPPED_TITLES keep a dense chapter spread.
"""
from __future__ import annotations

import json
import re
import zipfile
from collections import defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
ROOT = Path(__file__).resolve().parents[1]
FA = "۰۱۲۳۴۵۶۷۸۹"

# Entire usable article set — these are the codes people actually ask about.
FULL_TITLES = [
    "قانون اساسی",
    "قانون مدنی",
    "قانون مجازات اسلامی (با اصلاحات سال 1399)",
    "تعزیرات و مجازات های بازدارنده (با اصلاحات سال 1399)",
    "آیین دادرسی مدنی",
    "آیین دادرسی کیفری",
    "قانون کار",
    "قانون صدور چک(با اصلاحات 1400)",
    "قانون مسئولیت مدنی",
    "قانون اجرای احکام مدنی",
    "قانون حمایت خانواده",
    "قانون روابط موجر و مستاجر (مصوب 76 ، 62 ، 56)",
    "قانون تملک آپارتمانها",
    "قانون جرائم رایانه ای",
    "قانون مبارزه با مواد مخدر و الحاق موادی به آن (با آخرین تغییرات)",
    "قانون شوراهای حل اختلاف",
    "قانون مبارزه با پولشویی",
    "قانون بیمه اجباری خسارات واردشده به شخص ثالث در اثر حوادث ناشی از وسایل نقلیه 1395",
    "قانون تشکیلات و آیین دادرسی دیوان عدالت اداری",
]

# Large but secondary: keep coverage without exploding the bundled seed.
CAPPED_TITLES = [
    ("قانون تجارت (همراه قانون اصلاح قسمتی از قانون تجارت مصوب 1347)", 280),
    ("قانون امور حسبی", 140),
    ("قانون ثبت اسناد و املاک", 90),
    ("قانون مبارزه با قاچاق کالا و ارز مصوب 1392/03/10 با اصلاحات سال 1394", 75),
    ("قانون مالیات بر ارزش افزوده", 54),
    ("قانون مدیریت خدمات کشوری", 80),
    ("قانون مطبوعات", 48),
]

PINS = [
    ("قانون اساسی", r"برای خود وکیل انتخاب|امکانات تعیین وکیل|طرفین دعوی حق دارند"),
    ("قانون مدنی", r"قراردادهای خصوصی نسبت به کسانی که آن را منعقد"),
    ("قانون صدور چک", r"گواهی عدم پرداخت|چک بلامحل|مسدود کردن"),
    ("قانون مجازات اسلامی", r"ماده\s*612"),
    ("آیین دادرسی مدنی", r"فرجام.?خواهی"),
]

ONES = {
    "صفر": 0,
    "اول": 1,
    "یکم": 1,
    "یک": 1,
    "دوم": 2,
    "دو": 2,
    "سوم": 3,
    "سه": 3,
    "چهارم": 4,
    "چهار": 4,
    "پنجم": 5,
    "پنج": 5,
    "ششم": 6,
    "شش": 6,
    "هفتم": 7,
    "هفت": 7,
    "هشتم": 8,
    "هشت": 8,
    "نهم": 9,
    "نه": 9,
    "دهم": 10,
    "ده": 10,
    "یازدهم": 11,
    "یازده": 11,
    "دوازدهم": 12,
    "دوازده": 12,
    "سیزدهم": 13,
    "سیزده": 13,
    "چهاردهم": 14,
    "چهارده": 14,
    "پانزدهم": 15,
    "پانزده": 15,
    "شانزدهم": 16,
    "شانزده": 16,
    "هفدهم": 17,
    "هفده": 17,
    "هجدهم": 18,
    "هجده": 18,
    "نوزدهم": 19,
    "نوزده": 19,
}
TENS = {
    "بیست": 20,
    "بیستم": 20,
    "سی": 30,
    "سی‌ام": 30,
    "سی ام": 30,
    "چهلم": 40,
    "چهل": 40,
    "پنجاه": 50,
    "پنجاهم": 50,
    "شصت": 60,
    "شصتم": 60,
    "هفتاد": 70,
    "هفتادم": 70,
    "هشتاد": 80,
    "هشتادم": 80,
    "نود": 90,
    "نودم": 90,
}
HUNDREDS = {
    "صد": 100,
    "یکصد": 100,
    "یک‌صد": 100,
    "دویست": 200,
    "سیصد": 300,
    "چهارصد": 400,
    "پانصد": 500,
}


def to_en(s: str) -> str:
    return "".join(str(FA.index(ch)) if ch in FA else ch for ch in s)


def fa_words_to_int(s: str) -> int | None:
    s = s.replace("‌", " ").replace("-", " ").strip()
    s = re.sub(r"\s+", " ", s)
    if s.isdigit():
        return int(s)
    parts = [p.strip() for p in re.split(r"\s+و\s+", s) if p.strip()]
    total = 0
    for p in parts:
        if p in ONES:
            total += ONES[p]
        elif p in TENS:
            total += TENS[p]
        elif p in HUNDREDS:
            total += HUNDREDS[p]
        else:
            return None
    return total or None


def cell_val(cell, shared: list[str]) -> str:
    kind = cell.attrib.get("t")
    v = cell.find("m:v", NS)
    if kind == "s" and v is not None and v.text is not None:
        return shared[int(v.text)]
    if v is not None:
        return v.text or ""
    return ""


def find_xlsx() -> Path:
    dest_dir = ROOT / "data/raw/db07"
    zip_path = ROOT / "attachments" / "db07-persian law database.zip"
    if zip_path.exists() and not (dest_dir / "db07-persian law database" / "LawItem.xlsx").exists():
        dest_dir.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(zip_path) as z:
            z.extractall(dest_dir)
    nested = dest_dir / "db07-persian law database" / "LawItem.xlsx"
    if nested.exists():
        return nested
    raise SystemExit("LawItem.xlsx not found")


def load_rows(path: Path) -> list[dict]:
    z = zipfile.ZipFile(path)
    shared_root = ET.fromstring(z.read("xl/sharedStrings.xml"))
    shared = [
        "".join(t.text or "" for t in si.findall(".//m:t", NS))
        for si in shared_root.findall("m:si", NS)
    ]
    sheet = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
    out = []
    for row in sheet.findall("m:sheetData/m:row", NS)[1:]:
        cells = row.findall("m:c", NS)
        vals = [cell_val(c, shared) for c in cells] + [""] * 7
        content = (vals[3] or "").strip()
        if len(content) < 80:
            continue
        out.append(
            {
                "id": str(vals[1] or "").strip(),
                "content": content,
                "dir": (vals[4] or "").strip(),
                "title1": (vals[5] or "").strip(),
                "title": (vals[6] or "").strip(),
            }
        )
    return out


def article_number(content: str, direc: str) -> str | None:
    text = to_en(content)
    m = re.search(r"ماده\s*([0-9]+(?:\s*مکرر)?)", text)
    if m:
        return m.group(1).replace(" ", "")
    m = re.search(r"اصل\s*([0-9]+)", text)
    if m:
        return m.group(1)
    m = re.search(r"اصل\s+([^\n:]{2,40}?)(?:\s*:|$)", content)
    if m:
        words = to_en(m.group(1).strip())[:40]
        n = fa_words_to_int(words)
        return str(n) if n is not None else words
    m = re.search(r"اصل\s*([0-9]+)", to_en(direc))
    if m:
        return m.group(1)
    return None


def law_date(title: str) -> str | None:
    m = re.search(r"(13[0-9]{2}|14[0-9]{2})", to_en(title))
    return m.group(1) if m else None


def is_usable(row: dict, title: str) -> bool:
    if "مقدمه" in row["dir"] and title == "قانون اساسی":
        return False
    if "قدیم" in row["title"]:
        return False
    body = row["content"]
    if not re.search(r"(ماده|اصل)\s", body):
        return False
    if len(body) > 6000:
        return False
    return True


def spread(rows: list[dict], quota: int) -> list[dict]:
    by_dir: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        by_dir[r["dir"] or "_"].append(r)
    buckets = list(by_dir.values())
    picked: list[dict] = []
    seen: set[str] = set()

    def add(item: dict) -> bool:
        key = item["content"][:180]
        if key in seen:
            return False
        seen.add(key)
        picked.append(item)
        return True

    for bucket in buckets:
        if not bucket or len(picked) >= quota:
            continue
        n = max(1, min(len(bucket), max(1, quota // max(1, len(buckets)))))
        if len(bucket) <= n:
            for item in bucket:
                add(item)
        else:
            step = len(bucket) / n
            for i in range(n):
                add(bucket[min(len(bucket) - 1, int(i * step))])
    leftover = [item for bucket in buckets for item in bucket]
    i = 0
    while len(picked) < quota and leftover:
        add(leftover[i % len(leftover)])
        i += 1
        if i > quota * 20:
            break
    return picked[:quota]


def apply_pins(title: str, pool: list[dict], picked: list[dict]) -> list[dict]:
    have = {p["content"][:180] for p in picked}
    extra = []
    for tname, pattern in PINS:
        if tname not in title:
            continue
        rx = re.compile(pattern)
        for row in pool:
            key = row["content"][:180]
            if key in have:
                continue
            if rx.search(row["content"]):
                extra.append(row)
                have.add(key)
    return extra + picked


def to_chunk(title: str, row: dict) -> dict:
    return {
        "id": f"statute-db07-{row['id']}",
        "content": row["content"][:3500],
        "source_type": "statute",
        "source_title": title,
        "article_number": article_number(row["content"], row["dir"]),
        "law_date": law_date(title),
        "source_url": "db07-persian-law-database/LawItem.xlsx",
        "source_id": row["id"],
        "hf_dataset": "db07-persian-law-database",
        "dir": row["dir"],
        "title1": row["title1"],
    }


def resolve_title(by_title: dict[str, list[dict]], name: str) -> str | None:
    if name in by_title:
        return name
    hits = [t for t in by_title if name in t and "قدیم" not in t]
    if not hits:
        return None
    return min(hits, key=len)


def take_rows(
    title: str,
    pool: list[dict],
    quota: int | None,
    seen_ids: set[str],
) -> list[dict]:
    if quota is None:
        chosen = pool
    else:
        chosen = apply_pins(title, pool, spread(pool, min(quota, len(pool))))
    kept = []
    for r in chosen:
        if r["id"] in seen_ids:
            continue
        seen_ids.add(r["id"])
        kept.append(r)
    return kept


def main() -> None:
    xlsx = find_xlsx()
    rows = load_rows(xlsx)
    print("loaded", len(rows), "from", xlsx)

    selected: list[dict] = []
    report = []
    by_title: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        by_title[r["title"]].append(r)

    seen_ids: set[str] = set()
    jobs: list[tuple[str, int | None]] = [(t, None) for t in FULL_TITLES] + list(CAPPED_TITLES)
    for name, quota in jobs:
        title = resolve_title(by_title, name)
        if not title:
            report.append({"title": name, "pool": 0, "taken": 0})
            print("MISSING", name)
            continue
        pool = [r for r in by_title[title] if is_usable(r, title)]
        kept = take_rows(title, pool, quota, seen_ids)
        report.append({"title": title, "pool": len(pool), "taken": len(kept)})
        selected.extend(to_chunk(title, r) for r in kept)

    out = ROOT / "src/data/db07-statutes.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "source": "user-uploaded db07-persian law database/LawItem.xlsx",
        "why": "Complete core Iranian codes from the user's LawItem table (not a chapter sample). Gated HF statute datasets remain unused.",
        "total_selected": len(selected),
        "by_title": report,
        "chunks": selected,
    }
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print("wrote", out, "selected", len(selected))
    for item in report:
        print(f"  {item['taken']:4d}/{item['pool']:<5d}  {item['title'][:70]}")


if __name__ == "__main__":
    main()
