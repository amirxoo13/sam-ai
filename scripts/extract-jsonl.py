#!/usr/bin/env python3
"""Select unique, article-like chunks from persian-legal-rag-jsonl.

The repo has 82k chunks / 830 PDFs, including study notes, exams, and duplicates.
We keep statute PDFs that are NOT already fully covered by db07, plus advisory
opinions (نظریات مشورتی). Junk, OCR-spam, and textbooks are dropped.
"""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data/raw/persian-legal-rag-jsonl"
OUT = ROOT / "src/data/jsonl-selected.json"
META_OUT = ROOT / "src/data/jsonl-meta"

SKIP_RE = re.compile(
    r"جزوه|تست|سوال|استخدام|دکتری|ارشد|ثبت نام|اندیشه اسلامی|افغانستان|"
    r"نهج|استفتا|jozveban|روانشناس|راهنمای ثبت|NOTEPhd|NOTEArshad|RegNote|"
    r"دفترچه راهنما|آزمون|کارآموز|طلایی|کمک حافظه|نموداری|داوطلب|"
    r"مواد مهم|نکات_قانون|نکات قانون|شرح قانون|بررسی_و_تحلیل|بررسی و تحلیل|"
    r"دایره المعارف|قانون نویسی|قانون_یار|نامعتبر|پزشکی قانونی|"
    r"^Ghanoon\.pdf$",
    re.I,
)
OPINION_RE = re.compile(r"نظریات|نظریه مشورتی|نظریه های|نظریه با سوال")
CORE_RE = re.compile(
    r"قانون[_\s\-]*مدنی|قانون[_\s\-]*اساسی|قانون[_\s\-]*مجازات|"
    r"آیین[_\s\-]*دادرسی|آئين[_\s\-]*دادرسی|آئین[_\s\-]*دادرسی|"
    r"آ\.د\.م|آ\.د\.ک|"
    r"قانون[_\s\-]*کار|قانون[_\s\-]*صدور[_\s\-]*چک|قانون[_\s\-]*مسئولیت[_\s\-]*مدنی|"
    r"قانون[_\s\-]*اجرای[_\s\-]*احکام|"
    r"Islamic-Penal|Ghanoon-Madani|n\.ghanoon-asasi",
    re.I,
)
KEEP_EVEN_IF_CORE = re.compile(r"خاص|الکترونیک|کاهش حبس")
COMPILATION_RE = re.compile(
    r"Great-Bank|مجموعه[_\s\-]*قوانین|قوانین[_\s\-]*خاص|قوانین[_\s\-]*اقتصادی|"
    r"قوانین[_\s\-]*حقوقی|قانون[_\s\-]*جزایی|کتاب_مجموعه_قوانین",
    re.I,
)
DEV_PLAN_RE = re.compile(r"برنامه (اول|دوم|سوم|چهارم|پنجم|ششم) توسعه")
PAPER_RE = re.compile(r"بازاندیشی|آسیب شناسی|رویکرد_قانون|حاکمیّت|شرح جامع|ساده_ساز")
SPAM_RE = re.compile(r"jozveban|telegram\.me/jozve|w w w w|دانلود کنید \؟", re.I)
HAS_LAW_RE = re.compile(r"(ماده|اصل|نظریه)\s")
ART_RE = re.compile(r"ماده\s*([0-9]{1,4})", re.I)
PRINC_RE = re.compile(r"اصل\s*([0-9]{1,3})")
FA = "۰۱۲۳۴۵۶۷۸۹"

CAP_COMPILATION = 90
CAP_NAMED = 100
CAP_OPINION_PER = 28
CAP_OPINION_TOTAL = 420
TARGET_MAX = 1800
NAMED_MAX = 1250
OPINION_MAX = 400


def to_en(s: str) -> str:
    return "".join(str(FA.index(ch)) if ch in FA else ch for ch in s)


def norm_source(name: str) -> str:
    n = re.sub(r"\(\d+\)", "", name)
    n = re.sub(r"\.(pdf|PDF)$", "", n)
    n = re.sub(r"[_\-]+", " ", n)
    n = re.sub(r"\s+", " ", n).strip().lower()
    return n


def article_number(text: str) -> str | None:
    t = to_en(text)
    m = ART_RE.search(t)
    if m:
        return m.group(1)
    m = PRINC_RE.search(t)
    if m:
        return m.group(1)
    return None


def law_date(name: str) -> str | None:
    m = re.search(r"(13[0-9]{2}|14[0-9]{2})", to_en(name))
    return m.group(1) if m else None


def is_spam(text: str) -> bool:
    if SPAM_RE.search(text):
        return True
    if text.count("w w") >= 8:
        return True
    letters = sum(1 for ch in text if "\u0600" <= ch <= "\u06FF")
    if letters < 80:
        return True
    return False


def classify(name: str) -> str | None:
    if OPINION_RE.search(name) or re.search(r"وحدت\s*رویه|آرای وحدت", name):
        return "opinion"
    if SKIP_RE.search(name):
        return None
    if DEV_PLAN_RE.search(name) or PAPER_RE.search(name):
        return None
    if CORE_RE.search(name) and not KEEP_EVEN_IF_CORE.search(name):
        return None
    if re.search(
        r"قانون|قوانین|Ghanoon|ghanoon|Islamic-Penal|Great-Bank|مجموعه قوانین",
        name,
        re.I,
    ):
        return "statute"
    return None


def iter_records():
    for path in sorted((RAW / "data").glob("dataset_part_*.jsonl")):
        with path.open(encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                yield json.loads(line)


def round_robin(items: list[dict], cap: int) -> list[dict]:
    buckets: dict[str, list[dict]] = defaultdict(list)
    for item in items:
        buckets[item["origin_file"]].append(item)
    keys = list(buckets)
    out: list[dict] = []
    i = 0
    while len(out) < cap and keys:
        key = keys[i % len(keys)]
        if buckets[key]:
            out.append(buckets[key].pop(0))
        if not buckets[key]:
            keys.remove(key)
            if not keys:
                break
            i %= len(keys)
            continue
        i += 1
    return out


def main() -> None:
    if not (RAW / "data").exists():
        raise SystemExit(f"JSONL data missing at {RAW}/data")

    sources = json.loads((RAW / "metadata/sources.json").read_text(encoding="utf-8"))
    META_OUT.mkdir(parents=True, exist_ok=True)
    (META_OUT / "dataset_summary.json").write_text(
        (RAW / "metadata/dataset_summary.json").read_text(encoding="utf-8")
    )
    (META_OUT / "record_schema.json").write_text(
        (RAW / "metadata/record_schema.json").read_text(encoding="utf-8")
    )

    chunk_count: dict[str, int] = {
        item["source_file"]: item["chunks"] for item in sources["sources"]
    }
    best_file: dict[str, str] = {}
    best_n: dict[str, int] = {}
    for item in sources["sources"]:
        key = norm_source(item["source_file"])
        n = item["chunks"]
        if n > best_n.get(key, -1):
            best_n[key] = n
            best_file[key] = item["source_file"]

    collected: list[dict] = []
    per_source: dict[str, int] = defaultdict(int)
    seen_text: set[str] = set()
    opinion_n = 0
    skipped: dict[str, int] = defaultdict(int)

    for rec in iter_records():
        name = rec.get("source_file") or ""
        kind = classify(name)
        if not kind:
            skipped["class"] += 1
            continue
        key = norm_source(name)
        if best_file.get(key) != name:
            skipped["dup_source"] += 1
            continue

        text = (rec.get("text") or "").strip()
        wc = int(rec.get("word_count") or 0)
        if wc < 80 or wc > 900 or not (200 <= len(text) <= 4000):
            skipped["size"] += 1
            continue
        if is_spam(text) or not HAS_LAW_RE.search(text):
            skipped["spam"] += 1
            continue
        sig = re.sub(r"\s+", " ", text)[:180]
        if sig in seen_text:
            skipped["dup_text"] += 1
            continue

        is_comp = bool(kind == "statute" and COMPILATION_RE.search(name))
        if kind == "opinion":
            if opinion_n >= CAP_OPINION_TOTAL:
                skipped["opinion_cap"] += 1
                continue
            cap = CAP_OPINION_PER
        elif is_comp:
            cap = CAP_COMPILATION
        else:
            cap = CAP_NAMED
        if per_source[key] >= cap:
            skipped["src_cap"] += 1
            continue

        seen_text.add(sig)
        per_source[key] += 1
        if kind == "opinion":
            opinion_n += 1

        title = (rec.get("book_title") or "").strip() or Path(name).stem[:80]
        chunk = {
            "id": "jsonl-" + re.sub(r"[^A-Za-z0-9_\u0600-\u06FF-]+", "-", rec["id"])[:80],
            "content": text[:3500],
            "source_type": "case_law" if kind == "opinion" else "statute",
            "source_title": title if title else name,
            "article_number": article_number(text),
            "law_date": law_date(name),
            "source_url": f"https://github.com/amirxoo13/persian-legal-rag-jsonl ({name})",
            "source_id": rec["id"],
            "hf_dataset": "persian-legal-rag-jsonl",
            "origin_file": name,
            "_kind": kind,
            "_comp": is_comp,
        }
        collected.append(chunk)

    named = [c for c in collected if c["_kind"] == "statute" and not c["_comp"]]
    opinions = [c for c in collected if c["_kind"] == "opinion"]
    comps = [c for c in collected if c["_comp"]]

    selected: list[dict] = []
    selected.extend(round_robin(named, min(NAMED_MAX, TARGET_MAX)))
    remain = TARGET_MAX - len(selected)
    if remain > 0:
        selected.extend(round_robin(opinions, min(OPINION_MAX, remain)))
    remain = TARGET_MAX - len(selected)
    if remain > 0:
        selected.extend(round_robin(comps, remain))

    skipped["trimmed"] = max(0, len(collected) - len(selected))

    for chunk in selected:
        chunk.pop("_kind", None)
        chunk.pop("_comp", None)

    taken_sources: dict[str, int] = defaultdict(int)
    for chunk in selected:
        taken_sources[chunk["origin_file"]] += 1
    report = [
        {"source": k, "taken": n, "file_chunks": chunk_count.get(k, 0)}
        for k, n in sorted(taken_sources.items(), key=lambda kv: -kv[1])
    ]

    (META_OUT / "README.md").write_text(
        "# persian-legal-rag-jsonl\n\n"
        "منبع: https://github.com/amirxoo13/persian-legal-rag-jsonl\n\n"
        "۸۲۴۶۴ قطعه از ۸۳۰ فایل. خام JSONL در `data/raw/` می‌ماند (وارد git نمی‌شود).\n"
        f"پس از پالایش {len(selected)} قطعهٔ تمیز قانون خاص / ثبت / تجارت / "
        "تأمین اجتماعی / نظریات مشورتی وارد RAG شد. جزوه، تست و تکرار قوانین اصلی حذف شدند.\n",
        encoding="utf-8",
    )
    (META_OUT / "selection-report.json").write_text(
        json.dumps(
            {
                "total_selected": len(selected),
                "skipped": dict(skipped),
                "by_source": report,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    payload = {
        "source": "https://github.com/amirxoo13/persian-legal-rag-jsonl",
        "why": (
            "User asked to add the JSONL repo. 82464 raw chunks; this file is the "
            "filtered unique statute/opinion subset for RAG."
        ),
        "total_selected": len(selected),
        "skipped": dict(skipped),
        "by_source": report[:80],
        "chunks": selected,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print("wrote", OUT, "selected", len(selected))
    print("skipped", dict(skipped))
    print(
        "statute",
        sum(1 for c in selected if c["source_type"] == "statute"),
        "opinion",
        sum(1 for c in selected if c["source_type"] == "case_law"),
    )
    print("named collected", len(named), "opinions", len(opinions), "comps", len(comps))
    for item in report[:20]:
        print(f"  {item['taken']:4d}  {item['source'][:70]}")


if __name__ == "__main__":
    main()
