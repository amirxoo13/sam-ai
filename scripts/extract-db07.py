#!/usr/bin/env python3
"""Select a chapter-spread subset of real statutes from the user-provided db07 xlsx."""
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

QUOTAS = [
    ("قانون اساسی", 90),
    ("قانون مدنی", 90),
    ("قانون مجازات اسلامی (با اصلاحات سال 1399)", 70),
    ("آیین دادرسی مدنی", 45),
    ("آیین دادرسی کیفری", 45),
    ("قانون تجارت (همراه قانون اصلاح قسمتی از قانون تجارت مصوب 1347)", 30),
    ("قانون کار", 25),
    ("قانون صدور چک(با اصلاحات 1400)", 25),
    ("قانون مسئولیت مدنی", 20),
    ("قانون اجرای احکام مدنی", 25),
    ("قانون امور حسبی", 20),
    ("قانون ثبت اسناد و املاک", 15),
    ("قانون بیمه اجباری خسارات واردشده به شخص ثالث در اثر حوادث ناشی از وسایل نقلیه 1395", 15),
    ("قانون تشکیلات و آیین دادرسی دیوان عدالت اداری", 15),
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
    "سیم": 30,
    "سیام": 30,
    "چهل": 40,
    "چهلم": 40,
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
    "صدم": 100,
    "یکصد": 100,
    "یکصدم": 100,
    "دویست": 200,
    "دویستم": 200,
    "سیصد": 300,
    "سیصدم": 300,
    "چهارصد": 400,
    "چهارصدم": 400,
    "پانصد": 500,
    "پانصدم": 500,
}


def to_en(s: str) -> str:
    return "".join(str(FA.index(ch)) if ch in FA else ch for ch in s)


def fa_words_to_int(s: str) -> int | None:
    raw = to_en(s).replace("‌", " ").replace("-", " ").replace("ـ", " ").strip()
    raw = re.sub(r"\s+", " ", raw)
    if re.fullmatch(r"[0-9]+(?:مکرر)?", raw.replace(" ", "")):
        m = re.match(r"([0-9]+)", raw)
        return int(m.group(1)) if m else None
    parts = [p.strip() for p in re.split(r"\s+و\s+", raw) if p.strip()]
    if not parts:
        return None
    total = 0
    for part in parts:
        token = part.replace(" ", "")
        if token in ONES:
            total += ONES[token]
        elif token in TENS:
            total += TENS[token]
        elif token in HUNDREDS:
            total += HUNDREDS[token]
        elif token.isdigit():
            total += int(token)
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
        "content": row["content"][:2200],
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
    for title, quota in QUOTAS:
        pool = [r for r in by_title.get(title, []) if is_usable(r, title)]
        take = apply_pins(title, pool, spread(pool, min(quota, len(pool))))
        kept = []
        for r in take:
            if r["id"] in seen_ids:
                continue
            seen_ids.add(r["id"])
            kept.append(r)
        report.append({"title": title, "pool": len(pool), "taken": len(kept)})
        selected.extend(to_chunk(title, r) for r in kept)

    out = ROOT / "src/data/db07-statutes.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "source": "user-uploaded db07-persian law database/LawItem.xlsx",
        "why": "QomSSLab/legal_full_v4 and related HF datasets are personal/gated and access was denied. This corpus is the user's own law table (28461 rows, 962 titles).",
        "total_selected": len(selected),
        "by_title": report,
        "chunks": selected,
    }
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print("wrote", out, "selected", len(selected))
    for item in report:
        print(f"  {item['taken']:3d}/{item['pool']:<5d}  {item['title'][:70]}")


if __name__ == "__main__":
    main()
