#!/usr/bin/env python3
"""Ingest only the new source_files from persian-legal-rag-jsonl commit fe4f1cc.

Does not reshuffle the existing 1800 jsonl chunks. Skips جزوه / PPT / textbooks.
Keeps primary sources: آرای وحدت رویه ۸۰۲–۸۶۱ and نظریات مشورتی خرداد/تیر ۱۴۰۵.
"""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW_PART = ROOT / "data/raw/persian-legal-rag-jsonl/data/dataset_part_04.jsonl"
SELECTED = ROOT / "src/data/jsonl-selected.json"
SEED = ROOT / "src/data/legal-seed.json"
META_OUT = ROOT / "src/data/jsonl-meta"

KEEP_FILES = {
    "آرای وحدت رویه ۸۰۲ تا ۸۶۱.pdf": {
        "kind": "opinion",
        "title": "آرای وحدت رویه ۸۰۲ تا ۸۶۱ دیوان عالی کشور",
        "date": "1400",
    },
    "نظریات با سوال تیر ماه 1405.pdf": {
        "kind": "opinion",
        "title": "نظریات مشورتی اداره کل حقوقی قوه قضاییه — تیر ۱۴۰۵",
        "date": "1405",
    },
    "نظریات با سوال خرداد ماه 1405.pdf": {
        "kind": "opinion",
        "title": "نظریات مشورتی اداره کل حقوقی قوه قضاییه — خرداد ۱۴۰۵",
        "date": "1405",
    },
}

SKIP_NAME_RE = re.compile(
    r"جزوه|پاورپوینت|powerpoint|\.ppt|نکته طلایی|دادخواست|مصاحبه با موکل|"
    r"راهنمای_گام|متون_حقوقی|کلیات حقوق جزا|حقوق_رسانه|قواعد_فقه|"
    r"قانون_خاص_مدنی405|1_19015939235",
    re.I,
)
SPAM_RE = re.compile(r"jozveban|telegram\.me/jozve|w w w w|دانلود کنید \؟", re.I)
HAS_LAW_RE = re.compile(r"(ماده|اصل|نظریه|رأی|رای)\s")
ART_RE = re.compile(r"ماده\s*([0-9]{1,4})")
PRINC_RE = re.compile(r"اصل\s*([0-9]{1,3})")
RAI_RE = re.compile(
    r"(?:رأی|رای)\s*(?:وحدت\s*رویه\s*)?(?:شماره\s*)?([0-9۰-۹]{3,4})"
)
FA = "۰۱۲۳۴۵۶۷۸۹"
CAP_PER = 120
TARGET_MAX = 280


def to_en(s: str) -> str:
    return "".join(str(FA.index(ch)) if ch in FA else ch for ch in s)


def article_number(text: str, origin: str) -> str | None:
    t = to_en(text)
    if "وحدت" in origin or "آرای" in origin:
        m = RAI_RE.search(t)
        if m:
            return m.group(1)
    m = ART_RE.search(t)
    if m:
        return m.group(1)
    m = PRINC_RE.search(t)
    if m:
        return m.group(1)
    m = RAI_RE.search(t)
    if m:
        return m.group(1)
    return None


def is_spam(text: str) -> bool:
    if SPAM_RE.search(text):
        return True
    if text.count("w w") >= 8:
        return True
    letters = sum(1 for ch in text if "\u0600" <= ch <= "\u06FF")
    return letters < 80


def sig(text: str) -> str:
    return re.sub(r"\s+", " ", text)[:180]


def main() -> None:
    if not RAW_PART.exists():
        raise SystemExit(f"missing {RAW_PART}")

    selected = json.loads(SELECTED.read_text(encoding="utf-8"))
    existing_chunks: list[dict] = list(selected.get("chunks") or [])
    seen = {sig(c.get("content") or "") for c in existing_chunks}
    existing_ids = {c.get("id") for c in existing_chunks}

    if SEED.exists():
        seed = json.loads(SEED.read_text(encoding="utf-8"))
        for c in seed.get("chunks") or []:
            seen.add(sig(c.get("content") or ""))

    per_source: dict[str, int] = defaultdict(int)
    added: list[dict] = []
    skipped: dict[str, int] = defaultdict(int)
    seen_new_files: dict[str, int] = defaultdict(int)

    with RAW_PART.open(encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            rec = json.loads(line)
            name = rec.get("source_file") or ""
            seen_new_files[name] += 1
            meta = KEEP_FILES.get(name)
            if not meta:
                if SKIP_NAME_RE.search(name) or name not in KEEP_FILES:
                    skipped["skip_file"] += 1
                    continue

            text = (rec.get("text") or "").strip()
            wc = int(rec.get("word_count") or 0)
            if wc < 80 or wc > 900 or not (200 <= len(text) <= 4000):
                skipped["size"] += 1
                continue
            if is_spam(text) or not HAS_LAW_RE.search(to_en(text)):
                skipped["spam"] += 1
                continue
            s = sig(text)
            if s in seen:
                skipped["dup_text"] += 1
                continue
            if per_source[name] >= CAP_PER:
                skipped["src_cap"] += 1
                continue
            if len(added) >= TARGET_MAX:
                skipped["target"] += 1
                continue

            cid = "jsonl-" + re.sub(
                r"[^A-Za-z0-9_\u0600-\u06FF-]+", "-", rec["id"]
            )[:80]
            if cid in existing_ids:
                skipped["dup_id"] += 1
                continue

            seen.add(s)
            existing_ids.add(cid)
            per_source[name] += 1
            added.append(
                {
                    "id": cid,
                    "content": text[:3500],
                    "source_type": "case_law",
                    "source_title": meta["title"],
                    "article_number": article_number(text, name),
                    "law_date": meta["date"],
                    "source_url": (
                        "https://github.com/amirxoo13/persian-legal-rag-jsonl"
                        f" ({name})"
                    ),
                    "source_id": rec["id"],
                    "hf_dataset": "persian-legal-rag-jsonl",
                    "origin_file": name,
                }
            )

    selected["chunks"] = existing_chunks + added
    selected["total_selected"] = len(selected["chunks"])
    selected["why"] = (
        "User asked to add the JSONL repo. Original 1800 filtered statutes/"
        "opinions plus delta of آرای وحدت رویه ۸۰۲–۸۶۱ and نظریات مشورتی"
        " خرداد/تیر ۱۴۰۵ from commit fe4f1cc. جزوه/PPT/textbooks skipped."
    )
    selected["delta_fe4f1cc"] = {
        "added": len(added),
        "skipped": dict(skipped),
        "by_source": [
            {"source": k, "taken": n} for k, n in sorted(per_source.items())
        ],
        "new_files_seen": sorted(seen_new_files),
    }

    by_source = list(selected.get("by_source") or [])
    taken = {item["source"]: item for item in by_source}
    for name, n in per_source.items():
        if name in taken:
            taken[name]["taken"] = int(taken[name].get("taken") or 0) + n
        else:
            by_source.append(
                {
                    "source": name,
                    "taken": n,
                    "file_chunks": seen_new_files.get(name, n),
                }
            )
    selected["by_source"] = by_source
    SELECTED.write_text(
        json.dumps(selected, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    META_OUT.mkdir(parents=True, exist_ok=True)
    (META_OUT / "delta-fe4f1cc.json").write_text(
        json.dumps(selected["delta_fe4f1cc"], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    readme = (META_OUT / "README.md").read_text(encoding="utf-8")
    if "fe4f1cc" not in readme:
        readme = readme.rstrip() + (
            f"\n\nدلتای {len(added)} قطعه از آرای وحدت رویه ۸۰۲–۸۶۱ و "
            "نظریات مشورتی خرداد/تیر ۱۴۰۵ (commit fe4f1cc). "
            "جزوه، پاورپوینت و کتاب درسی وارد RAG نشد.\n"
        )
        (META_OUT / "README.md").write_text(readme, encoding="utf-8")

    print("added", len(added), "total_selected", selected["total_selected"])
    print("skipped", dict(skipped))
    for name, n in per_source.items():
        print(f"  {n:4d}  {name}")
    print("new files in part_04 tail:", len(seen_new_files))


if __name__ == "__main__":
    main()
