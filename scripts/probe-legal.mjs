#!/usr/bin/env node
/**
 * Stage 0 pings + remaining category 3/4 downloads + gated-access attempts.
 * Real HTTP only. Writes reports under data/raw/reports/.
 */
import { mkdir, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";

const HF_TOKEN = process.env.HF_TOKEN || "";
const QWEN_API_KEY = process.env.QWEN_API_KEY || "";
const QWEN_BASE_URL =
  process.env.QWEN_BASE_URL ||
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const QWEN_MODEL = process.env.QWEN_MODEL || "qwen3.8-max";
const EMBED_MODEL = process.env.EMBEDDING_MODEL || "intfloat/multilingual-e5-small";
const EMBED_URL = `https://router.huggingface.co/hf-inference/models/${EMBED_MODEL}/pipeline/feature-extraction`;

if (!HF_TOKEN) {
  console.error("HF_TOKEN missing");
  process.exit(1);
}
if (!QWEN_API_KEY) {
  console.error("QWEN_API_KEY missing");
  process.exit(1);
}

async function fetchText(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 20000);
  try {
    const res = await fetch(url, {
      ...opts,
      signal: ctrl.signal,
      headers: {
        "User-Agent": "SAM-AI-legal-probe/1.0",
        ...(opts.headers || {}),
      },
      redirect: "follow",
    });
    const body = await res.text();
    return {
      url,
      status: res.status,
      ok: res.ok,
      contentType: res.headers.get("content-type"),
      body: body.slice(0, opts.max ?? 4000),
    };
  } catch (err) {
    return { url, error: err.name === "AbortError" ? "timeout" : String(err) };
  } finally {
    clearTimeout(t);
  }
}

async function fetchJson(url, opts = {}) {
  const r = await fetchText(url, { ...opts, max: opts.max ?? 8000 });
  if (r.error) return r;
  try {
    return { ...r, json: JSON.parse(r.body) };
  } catch {
    return { ...r, json: null };
  }
}

async function hfApi(path, { method = "GET", body } = {}) {
  return fetchJson(`https://huggingface.co${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function pingHf() {
  const res = await fetch(EMBED_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ inputs: ["query: رأی وحدت رویه"] }),
  });
  const json = await res.json().catch(() => null);
  const dim = Array.isArray(json) && Array.isArray(json[0]) ? json[0].length : Array.isArray(json) ? json.length : null;
  return { status: res.status, ok: res.ok, dim, preview: Array.isArray(json) ? "array" : json };
}

async function pingQwen() {
  const res = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${QWEN_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: QWEN_MODEL,
      messages: [
        { role: "user", content: "فقط بنویس: پینگ موفق" },
      ],
      max_tokens: 32,
      temperature: 0,
      enable_thinking: false,
    }),
  });
  const json = await res.json().catch(() => ({}));
  return {
    status: res.status,
    ok: res.ok,
    model: json.model ?? QWEN_MODEL,
    content: json.choices?.[0]?.message?.content ?? null,
    error: json.error ?? null,
  };
}

async function requestGatedAccess(id) {
  const attempts = [
    await hfApi(`/api/datasets/${id}/user-access-request`, {
      method: "POST",
      body: { status: "pending" },
    }),
  ];
  return attempts.map((a) => ({
    status: a.status,
    ok: a.ok,
    error: a.error,
    json: a.json,
    body: a.body?.slice(0, 400),
  }));
}

async function downloadHubFile(repo, filename, dest) {
  const url = `https://huggingface.co/datasets/${repo}/resolve/main/${filename}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 60000);
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${HF_TOKEN}` },
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      return { repo, filename, status: res.status, error: body.slice(0, 300) };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await mkdir(join(dest, ".."), { recursive: true });
    await writeFile(dest, buf);
    return { repo, filename, status: 200, bytes: buf.length, dest };
  } catch (err) {
    return { repo, filename, error: String(err) };
  } finally {
    clearTimeout(t);
  }
}

async function listDataset(id) {
  const api = await hfApi(`/api/datasets/${id}`);
  const siblings = (api.json?.siblings || []).map((s) => ({
    rfilename: s.rfilename,
    size: s.size,
  }));
  return {
    id,
    status: api.status,
    gated: api.json?.gated ?? null,
    private: api.json?.private ?? null,
    cardData: api.json?.cardData ?? null,
    siblings,
    error: api.error,
  };
}

async function rowsPreview(id, n = 3) {
  const url =
    `https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(id)}` +
    `&config=default&split=train&offset=0&length=${n}`;
  return fetchJson(url, {
    headers: { Authorization: `Bearer ${HF_TOKEN}` },
  });
}

const ROOT = "/workspace";

async function main() {
  await mkdir(join(ROOT, "data/raw/reports"), { recursive: true });
  await mkdir(join(ROOT, "data/raw/future-sft"), { recursive: true });
  await mkdir(join(ROOT, "data/raw/eval"), { recursive: true });

  console.log("=== ping HF ===");
  const hf = await pingHf();
  console.log(JSON.stringify(hf));

  console.log("=== ping Qwen ===");
  const qwen = await pingQwen();
  console.log(JSON.stringify(qwen));

  const gatedIds = [
    "QomSSLab/legal_full_v4",
    "QomSSLab/legal_full_v3",
    "QomSSLab/main_law_qa",
    "QomSSLab/Legal_SyntheticLegalQA-Bench-v2",
  ];
  const gated = {};
  for (const id of gatedIds) {
    gated[id] = {
      meta: await listDataset(id),
      rows: (await rowsPreview(id, 2)).json || (await rowsPreview(id, 2)),
      access: await requestGatedAccess(id),
    };
    console.log("gated", id, gated[id].meta.gated, gated[id].meta.status);
  }

  const openIds = [
    "PerSets/iran-legal-persian-qa",
    "Marykka/Bonyad_Vokala_Legal_QA_Dataset",
    "hamidsalimi/Persian-Civil-Procedure1-QA-Dataset-AYIN-DADRESI-MADANI-1",
    "sasanbarok/iran-legal-Faq-dataset",
    "QomSSLab/law-text-dataset-fa",
  ];
  const listed = {};
  for (const id of openIds) {
    listed[id] = await listDataset(id);
    console.log("list", id, listed[id].status, "files", listed[id].siblings.length);
  }

  const downloads = [];
  // sasanbarok: try common filenames
  const sasanFiles = (listed["sasanbarok/iran-legal-Faq-dataset"]?.siblings || []).map(
    (s) => s.rfilename,
  );
  console.log("sasan files", sasanFiles);
  for (const f of sasanFiles.filter((n) => /\.(json|jsonl|csv|parquet|txt|md)$/i.test(n)).slice(0, 8)) {
    downloads.push(
      await downloadHubFile(
        "sasanbarok/iran-legal-Faq-dataset",
        f,
        join(ROOT, "data/raw/eval", "sasanbarok__" + f.replaceAll("/", "_")),
      ),
    );
  }

  // hamidsalimi is small (300 rows) — download parquet if listed
  const hamidFiles = listed["hamidsalimi/Persian-Civil-Procedure1-QA-Dataset-AYIN-DADRESI-MADANI-1"]?.siblings || [];
  for (const f of hamidFiles.filter((s) => /\.(parquet|json|jsonl|csv)$/i.test(s.rfilename)).slice(0, 4)) {
    downloads.push(
      await downloadHubFile(
        "hamidsalimi/Persian-Civil-Procedure1-QA-Dataset-AYIN-DADRESI-MADANI-1",
        f.rfilename,
        join(ROOT, "data/raw/future-sft", "hamidsalimi__" + f.rfilename.replaceAll("/", "_")),
      ),
    );
  }

  const sites = [
    "https://qavanin.ir/robots.txt",
    "https://www.qavanin.ir/robots.txt",
    "https://ara.jri.ac.ir/robots.txt",
    "https://www.ara.jri.ac.ir/robots.txt",
    "https://qavanin.ir/",
    "https://ara.jri.ac.ir/",
    "https://data.eadl.ir/",
    "https://catalog.data.gov.ir/",
  ];
  const siteHits = [];
  for (const url of sites) {
    const r = await fetchText(url, { timeoutMs: 12000, max: 2500 });
    siteHits.push(r);
    console.log("site", url, r.status || r.error);
  }

  const report = { hf, qwen, gated, listed, downloads, siteHits, at: new Date().toISOString() };
  const path = join(ROOT, "data/raw/reports/probe-report.json");
  await writeFile(path, JSON.stringify(report, null, 2));
  console.log("wrote", path);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
