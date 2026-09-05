#!/usr/bin/env python3
"""Select article-level chunks from the user-uploaded ekhtebar scrape PDFs.

The zip is 126 born-digital PDFs (not scans). Core codes already fully covered
by db07 are skipped. Remaining statutes are split on ماده.
"""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
RAW = Path("/tmp/scrape-records")
if not RAW.exists():
    RAW = ROOT / "data/raw/ekhtebar-pdfs"
OUT = ROOT / "src/data/ekhtebar-selected.json"

FA = "۰۱۲۳۴۵۶۷۸۹"
ART_RE = re.compile(r"ماده\s*([0-9۰-۹]{1,4}|واحده)", re.I)
PRINC_RE = re.compile(r"اصل\s*([0-9۰-۹]{1,3})")
SPLIT_RE = re.compile(
    r"(?=ماده\s*(?:واحده|[0-9۰-۹]{1,4}(?:\s*مکرر)?)[.\-–—ـ:\s])"
)
WATERMARK_RE = re.compile(
    r"www\.ekhtebar\.(?:com|ir)|اختصاصی پایگاه خبری اختبار|صفحه\s*\d+",
    re.I,
)
SKIP_TITLE_RE = re.compile(
    r"(قانون اساسی(?!.*الکترونیک)|قانون مدنی(?!.*خاص)|"
    r"قانون کار(?!.*نامعتبر)|قانون مجازات اسلامی|تعزیرات و مجازات|"
    r"آیین\s*دادرسی\s*مدنی|آیین\s*دادرسی\s*کیفری|آئين\s*دادرسی|"
    r"صدور چک|چک[‌\s\-]*های تضمین|"
    r"مسئولیت مدنی|اجرای احکام مدنی|"
    r"حمایت خانواده(?!.*کودک)|موجر و مستاجر|موجر و مستأجر|"
    r"تملک آپارتمان|جرائم رایانه|جرایم رایانه|"
    r"مواد مخدر|شوراهای حل اختلاف|مبارزه با پولشویی|"
    r"بیمه اجباری خسارات|"
    r"فهرست قوانین و احکام نامعتبر|"
    r"برنامه (سوم|چهارم|پنجم|ششم) توسعه|"
    r"قانون برنامه پنج|قانون برنامه ششم|قانون برنامه چهارم)",
    re.I,
)
CAP_PER_LAW = 40
TARGET_MAX = 1600


def to_en(s: str) -> str:
    return "".join(str(FA.index(ch)) if ch in FA else ch for ch in s)


def decode_hex_name(name: str) -> str:
    n = re.sub(r"^file-[0-9a-f]+-?", "", name, flags=re.I)
    n = re.sub(r"\.(pdf|pd)$", "", n, flags=re.I)
    parts = []
    for part in n.split("-"):
        if re.fullmatch(r"[0-9A-Fa-f]+", part) and len(part) >= 4:
            hx = part if len(part) % 2 == 0 else part[:-1]
            try:
                parts.append(bytes.fromhex(hx).decode("utf-8", errors="ignore"))
                continue
            except ValueError:
                pass
        parts.append(part)
    return re.sub(r"\s+", " ", " ".join(parts).replace("_", " ")).strip()


def fa_ratio(text: str) -> float:
    if not text:
        return 0.0
    fa = sum(1 for ch in text if "\u0600" <= ch <= "\u06FF")
    return fa / max(len(text), 1)


def clean_text(text: str) -> str:
    text = WATERMARK_RE.sub(" ", text)
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def law_title(text: str, pdf_title: str, name_title: str) -> str:
    pt = (pdf_title or "").strip()
    if "قانون" in pt or "لایحه" in pt or "آیین" in pt:
        t = re.sub(r"\s+", " ", pt)
        t = re.sub(r"\s*[-–|].*سایت.*", "", t)
        t = re.sub(r"\s*[-–|].*اختبار.*", "", t)
        if 6 < len(t) < 140:
            return t.strip(" -")
    for line in text.splitlines()[:20]:
        line = re.sub(r"\s+", " ", line).strip(" .:-")
        if re.match(r"^(قانون|لایحه قانونی|آیین[\s‌]*نامه)", line) and 8 < len(line) < 120:
            if "www." in line.lower():
                continue
            return line
    m = re.search(r"((?:قانون|لایحه قانونی)[^\n.]{4,80})", text[:1800])
    if m:
        cand = re.sub(r"\s+", " ", m.group(1)).strip()
        if len(cand) < 120:
            return cand
    return name_title or "قانون"


def article_number(text: str) -> str | None:
    t = to_en(text)
    m = ART_RE.search(t)
    if m:
        n = m.group(1)
        return "واحده" if n == "واحده" else n.lstrip("0") or "0"
    m = PRINC_RE.search(t)
    return m.group(1) if m else None


def law_date(text: str) -> str | None:
    t = to_en(text[:1200])
    m = re.search(r"(13[0-9]{2}|14[0-9]{2})", t)
    return m.group(1) if m else None


def extract_pdf(path: Path) -> tuple[str, str]:
    reader = PdfReader(str(path), strict=False)
    meta = reader.metadata or {}
    pdf_title = ""
    try:
        pdf_title = str(getattr(meta, "title", None) or meta.get("/Title") or "")
    except Exception:
        pdf_title = ""
    pages = []
    for page in reader.pages:
        try:
            pages.append(page.extract_text() or "")
        except Exception:
            pages.append("")
    return clean_text("\n".join(pages)), pdf_title


def split_articles(text: str) -> list[str]:
    parts = [p.strip() for p in SPLIT_RE.split(text) if p.strip()]
    if len(parts) <= 1:
        # preamble-only or ماده واحده without splitter
        if len(text) > 400:
            return [text]
        return []
    # If the first piece is a long preamble, keep a trimmed copy then articles.
    out: list[str] = []
    preamble = parts[0]
    if ART_RE.search(preamble) or PRINC_RE.search(preamble):
        out.append(preamble)
    elif 400 <= len(preamble) <= 3500 and fa_ratio(preamble) > 0.3:
        out.append(preamble[:3500])
    out.extend(parts[1:])
    return out


def should_skip_title(title: str) -> bool:
    return bool(SKIP_TITLE_RE.search(title))


def slug(s: str) -> str:
    s = re.sub(r"[^\w\u0600-\u06FF]+", "-", s)
    return s.strip("-")[:50] or "law"


def round_robin(items: list[dict], cap: int) -> list[dict]:
    by: dict[str, list[dict]] = defaultdict(list)
    for c in items:
        by[c["source_title"]].append(c)
    out: list[dict] = []
    keys = list(by)
    i = 0
    while len(out) < cap and keys:
        k = keys[i % len(keys)]
        if by[k]:
            out.append(by[k].pop(0))
        if not by[k]:
            keys.remove(k)
            if not keys:
                break
            i %= len(keys)
            continue
        i += 1
    return out


def main() -> None:
    files = [p for p in sorted(RAW.iterdir()) if p.is_file() and p.name != "index.json"]
    if not files:
        raise SystemExit(f"no PDFs in {RAW}")

    selected: list[dict] = []
    per_law: dict[str, int] = defaultdict(int)
    seen: set[str] = set()
    skipped: dict[str, int] = defaultdict(int)
    file_report: list[dict] = []

    for path in files:
        try:
            text, pdf_title = extract_pdf(path)
        except Exception as err:
            skipped["read_err"] += 1
            file_report.append({"file": path.name, "error": str(err)[:120]})
            continue
        name_title = decode_hex_name(path.name)
        title = law_title(text, pdf_title, name_title)
        if should_skip_title(title) or should_skip_title(name_title):
            skipped["core_overlap"] += 1
            file_report.append({"file": path.name, "title": title, "status": "skip_core"})
            continue
        if fa_ratio(text) < 0.25 or len(text) < 400:
            skipped["thin"] += 1
            file_report.append({"file": path.name, "title": title, "status": "thin"})
            continue

        pieces = split_articles(text)
        kept_here = 0
        for piece in pieces:
            if per_law[title] >= CAP_PER_LAW:
                skipped["law_cap"] += 1
                break
            body = piece.strip()
            if not (200 <= len(body) <= 4000):
                if len(body) > 4000:
                    body = body[:3500]
                else:
                    skipped["size"] += 1
                    continue
            wc = len(body.split())
            if wc < 40 or wc > 1200:
                skipped["size"] += 1
                continue
            if not ART_RE.search(body) and not PRINC_RE.search(body) and kept_here > 0:
                skipped["no_article"] += 1
                continue
            sig = re.sub(r"\s+", " ", body)[:180]
            if sig in seen:
                skipped["dup"] += 1
                continue
            seen.add(sig)
            art = article_number(body)
            fid = path.stem.split("-")[1] if "-" in path.stem else path.stem[:8]
            cid = f"ekhtebar-{fid}-{art or kept_here}-{per_law[title]}"
            cid = re.sub(r"[^A-Za-z0-9_\u0600-\u06FF-]+", "-", cid)[:80]
            selected.append(
                {
                    "id": cid,
                    "content": body[:3500],
                    "source_type": "statute",
                    "source_title": title[:160],
                    "article_number": art,
                    "law_date": law_date(text),
                    "source_url": "https://www.ekhtebar.ir/قوانین/",
                    "source_id": path.name[:80],
                    "hf_dataset": "ekhtebar-pdf-scrape",
                    "origin_file": path.name,
                }
            )
            per_law[title] += 1
            kept_here += 1
        file_report.append(
            {
                "file": path.name,
                "title": title,
                "status": "ok",
                "kept": kept_here,
                "chars": len(text),
            }
        )

    if len(selected) > TARGET_MAX:
        skipped["trimmed"] = len(selected) - TARGET_MAX
        selected = round_robin(selected, TARGET_MAX)
        per_law = defaultdict(int)
        for c in selected:
            per_law[c["source_title"]] += 1

    payload = {
        "source": "user-uploaded Apify scrape zip of ekhtebar law PDFs",
        "why": "126 born-digital PDFs; core codes already in db07 skipped; remaining split on ماده.",
        "total_selected": len(selected),
        "skipped": dict(skipped),
        "by_law": [
            {"title": k, "taken": n}
            for k, n in sorted(per_law.items(), key=lambda kv: -kv[1])
        ],
        "files": file_report,
        "chunks": selected,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print("wrote", OUT, "selected", len(selected))
    print("skipped", dict(skipped))
    print("laws", len(per_law))
    for item in payload["by_law"][:25]:
        print(f"  {item['taken']:4d}  {item['title'][:70]}")
    skip_files = [f for f in file_report if f.get("status") == "skip_core"]
    print("skipped core files", len(skip_files))
    for f in skip_files[:20]:
        print("  skip", f.get("title", "")[:70])


if __name__ == "__main__":
    main()
