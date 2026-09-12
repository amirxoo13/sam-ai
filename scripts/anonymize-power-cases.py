#!/usr/bin/env python3
"""Rewrite power-cases-full.jsonl.gz: keep legal fields, drop litigant identity."""

from __future__ import annotations

import gzip
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src/data/power-cases-full.jsonl.gz"
DST = ROOT / "src/data/power-cases-full.jsonl.gz"

PII_KEYS = {
    "nationalcode",
    "national_code",
    "identityno",
    "identity_no",
    "fullname",
    "full_name",
    "fathername",
    "father_name",
    "birthdate",
    "birth_date",
    "mobile",
    "phone",
    "tel",
    "telephone",
    "email",
    "address",
    "postalcode",
    "postal_code",
}
PERSON_KEEP = {"role", "persontype", "legaltype", "nationality", "sex"}


def norm_key(k: str) -> str:
    return re.sub(r"[\s_-]", "", k).lower()


def collect_strings(value, out: list[str]) -> None:
    if isinstance(value, str):
        t = value.strip()
        if len(t) >= 2:
            out.append(t)
        return
    if isinstance(value, list):
        for item in value:
            collect_strings(item, out)
        return
    if isinstance(value, dict):
        for k, v in value.items():
            if norm_key(k) in PII_KEYS:
                collect_strings(v, out)


def redact_text(text: str, phrases: list[str]) -> str:
    out = text
    for phrase in phrases:
        if len(phrase) < 2:
            continue
        out = out.replace(phrase, "……")
    return out


def walk_redact(value, phrases: list[str]):
    if isinstance(value, str):
        return redact_text(value, phrases)
    if isinstance(value, list):
        return [walk_redact(item, phrases) for item in value]
    if isinstance(value, dict):
        next_obj = {}
        for k, v in value.items():
            if norm_key(k) in PII_KEYS:
                continue
            next_obj[k] = walk_redact(v, phrases)
        return next_obj
    return value


def sanitize_persons(persons, phrases: list[str]):
    if not isinstance(persons, list):
        return []
    out = []
    for person in persons:
        if not isinstance(person, dict):
            out.append({"role": "طرف پرونده"})
            continue
        kept = {}
        for k, v in person.items():
            if norm_key(k) not in PERSON_KEEP:
                continue
            kept[k] = redact_text(v, phrases) if isinstance(v, str) else v
        if "role" not in kept:
            kept["role"] = "طرف پرونده"
        out.append(kept)
    return out


def roles_title(persons, subject) -> str:
    roles = []
    if isinstance(persons, list):
        for person in persons:
            if isinstance(person, dict):
                role = person.get("role")
                if isinstance(role, str) and role.strip():
                    roles.append(role.strip())
    unique = list(dict.fromkeys(roles))
    head = " · ".join(unique) if unique else "پرونده قضایی (هویت حذف‌شده)"
    subj = subject.strip() if isinstance(subject, str) else ""
    return f"{head} — {subj}" if subj else head


def anonymize_record(rec: dict) -> dict:
    raw = rec.get("content") or ""
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        rec["source_title"] = "پرونده قضایی (هویت حذف‌شده)"
        rec["content"] = "{}"
        return rec
    if not isinstance(parsed, dict):
        rec["source_title"] = "پرونده قضایی (هویت حذف‌شده)"
        rec["content"] = "{}"
        return rec
    phrases: list[str] = []
    collect_strings(parsed.get("persons"), phrases)
    phrases.sort(key=len, reverse=True)
    persons = sanitize_persons(parsed.get("persons"), phrases)
    parsed["persons"] = persons
    cleaned = walk_redact(parsed, phrases)
    cleaned["persons"] = persons
    rec["content"] = json.dumps(cleaned, ensure_ascii=False, separators=(",", ":"))
    rec["source_title"] = roles_title(persons, cleaned.get("subject"))
    return rec


def main() -> None:
    rows = []
    with gzip.open(SRC, "rt", encoding="utf-8") as fh:
        for line in fh:
            if not line.strip():
                continue
            rows.append(anonymize_record(json.loads(line)))
    tmp = DST.with_suffix(".tmp.gz")
    with gzip.open(tmp, "wt", encoding="utf-8") as fh:
        for rec in rows:
            fh.write(json.dumps(rec, ensure_ascii=False, separators=(",", ":")) + "\n")
    tmp.replace(DST)
    print(f"rewrote {len(rows)} records -> {DST}")


if __name__ == "__main__":
    main()
