import * as cheerio from "cheerio";
import { createHash } from "node:crypto";
import { getSql } from "@/lib/db";
import { embedTexts } from "@/lib/legal/embeddings.server";
import { isAllowed } from "./robots.server";
import { ensureVectorColumn, replaceChunksForSourceUrl } from "./store.server";

/**
 * این User-Agent عمداً واقعی و شفاف است — شناسه‌ی ربات، آدرس سایت، و مقصودش
 * (پژوهش حقوقی) را می‌گوید. کرال کردن سایت‌های دولتی باید محترمانه و
 * قابل‌ردیابی باشد، نه پنهانی.
 */
const USER_AGENT = "SAMAIBot/1.0 (+https://sam-ai-green.vercel.app; legal-research crawler)";
const FETCH_TIMEOUT_MS = 15_000;
const CHUNK_SIZE = 1100;
const CHUNK_OVERLAP = 150;
const MAX_LINKS_PER_PAGE = 40;
const REFRESH_AFTER_HOURS = 24;
const REFRESH_BATCH_PER_SOURCE = 3;

/**
 * منابع اولیه — هر دو رسمی و دولتی، تأییدشده با جست‌وجوی زنده قبل از افزودن:
 * qavanin.ir (سامانه ملی قوانین و مقررات کشور) و rc.majlis.ir (مرکز
 * پژوهش‌های مجلس شورای اسلامی). افزودن منبع جدید فقط یعنی یک آیتم به همین
 * آرایه اضافه کنی — بقیه‌ی pipeline خودکار کار می‌کند.
 */
const SEED_SOURCES: {
  id: string;
  name: string;
  baseUrl: string;
  allowedHost: string;
  seedUrls: string[];
}[] = [
  {
    id: "qavanin",
    name: "پایگاه ملی قوانین و مقررات کشور",
    baseUrl: "https://qavanin.ir",
    allowedHost: "qavanin.ir",
    seedUrls: ["https://qavanin.ir/"],
  },
  {
    id: "majlis",
    name: "مرکز پژوهش‌های مجلس شورای اسلامی",
    baseUrl: "https://rc.majlis.ir",
    allowedHost: "majlis.ir",
    seedUrls: ["https://rc.majlis.ir/fa/law/search"],
  },
];

async function ensureSourcesSeeded(): Promise<void> {
  const sql = await getSql();
  for (const s of SEED_SOURCES) {
    const existing = await sql.query<{ id: string }>("select id from crawl_source where id = $1", [s.id]);
    if (existing.length > 0) continue;
    await sql.query(
      `insert into crawl_source (id, name, base_url, seed_urls, allowed_host)
       values ($1,$2,$3,$4::jsonb,$5)`,
      [s.id, s.name, s.baseUrl, JSON.stringify(s.seedUrls), s.allowedHost],
    );
    for (const url of s.seedUrls) {
      await sql.query(
        "insert into crawl_page (url, source_id) values ($1,$2) on conflict (url) do nothing",
        [url, s.id],
      );
    }
  }
}

function normalizeUrl(href: string, base: string): string | null {
  try {
    const u = new URL(href, base);
    u.hash = "";
    if (!["http:", "https:"].includes(u.protocol)) return null;
    return u.toString();
  } catch {
    return null;
  }
}

function extractText(html: string): { text: string; title: string; links: string[] } {
  const $ = cheerio.load(html);
  $("script, style, nav, header, footer, noscript, iframe, svg").remove();
  const text = $("body")
    .text()
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const title = $("title").first().text().trim().slice(0, 300);
  const links: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (href) links.push(href);
  });
  return { text, title, links };
}

function chunkText(text: string): string[] {
  if (text.length === 0) return [];
  if (text.length <= CHUNK_SIZE) return [text];
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    if (end === text.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export interface CrawlTickResult {
  sourcesProcessed: string[];
  processed: number;
  updated: number;
  unchanged: number;
  skipped: number;
  failed: number;
  newlyDiscovered: number;
  queueRemaining: number;
}

/**
 * یک «تیک» کرال — Cron هر بار همین را صدا می‌زند و فقط یک batch محدود
 * پردازش می‌شود (نه کل سایت یک‌جا — روی Vercel امکان اجرای ساعت‌ها را
 * نداریم، و مهم‌تر، فشار ناگهانی روی سرورهای دولتی درست نیست). با batchهای
 * کوچک و مکرر، کل سایت طی چند روز به‌طور کامل خوانده می‌شود؛ از آن به بعد
 * فقط صفحات جدید یا تغییرکرده (تشخیص با هش محتوا) دوباره embed می‌شوند.
 */
export async function runCrawlBatch(limit = 15): Promise<CrawlTickResult> {
  await ensureSourcesSeeded();
  await ensureVectorColumn();
  const sql = await getSql();

  const sources = await sql.query<{ id: string; allowed_host: string }>(
    "select id, allowed_host from crawl_source where enabled = true",
  );

  const result: CrawlTickResult = {
    sourcesProcessed: [],
    processed: 0,
    updated: 0,
    unchanged: 0,
    skipped: 0,
    failed: 0,
    newlyDiscovered: 0,
    queueRemaining: 0,
  };

  for (const source of sources) {
    if (result.processed >= limit) break;
    result.sourcesProcessed.push(source.id);

    // صفحاتِ قدیمی (بیش از ۲۴ ساعت) را برای بازبینیِ تغییر، دوباره صف کن —
    // این همان مکانیزم «دفعه‌ی بعد فقط جدیدها» را برعکس هم پوشش می‌دهد:
    // پیج‌های ثابت خیلی کم دوباره پردازش می‌شوند (چون هش عوض نشده، فوراً done می‌شوند).
    await sql.query(
      `update crawl_page set status = 'pending'
       where url in (
         select url from crawl_page
         where source_id = $1 and status = 'done'
           and last_crawled_at < now() - interval '${REFRESH_AFTER_HOURS} hours'
         order by last_crawled_at asc
         limit ${REFRESH_BATCH_PER_SOURCE}
       )`,
      [source.id],
    );

    const remaining = limit - result.processed;
    const pages = await sql.query<{ url: string; content_hash: string | null }>(
      `select url, content_hash from crawl_page
       where source_id = $1 and status = 'pending'
       order by discovered_at asc
       limit $2`,
      [source.id, remaining],
    );

    for (const page of pages) {
      result.processed += 1;
      try {
        const allowed = await isAllowed(page.url, USER_AGENT);
        if (!allowed) {
          await sql.query(
            "update crawl_page set status='skipped', last_crawled_at=now(), last_error='robots.txt disallow' where url=$1",
            [page.url],
          );
          result.skipped += 1;
          continue;
        }

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        let res: Response;
        try {
          res = await fetch(page.url, {
            headers: { "User-Agent": USER_AGENT, "Accept-Language": "fa,en;q=0.5" },
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timer);
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("text/html")) {
          await sql.query(
            "update crawl_page set status='skipped', last_crawled_at=now(), last_error=$2 where url=$1",
            [page.url, `content-type: ${contentType}`],
          );
          result.skipped += 1;
          continue;
        }

        const html = await res.text();
        const { text, title, links } = extractText(html);

        for (const href of links.slice(0, MAX_LINKS_PER_PAGE)) {
          const abs = normalizeUrl(href, page.url);
          if (!abs) continue;
          let host: string;
          try {
            host = new URL(abs).host;
          } catch {
            continue;
          }
          if (!host.endsWith(source.allowed_host)) continue;
          const inserted = await sql.query<{ url: string }>(
            "insert into crawl_page (url, source_id) values ($1,$2) on conflict (url) do nothing returning url",
            [abs, source.id],
          );
          if (inserted.length > 0) result.newlyDiscovered += 1;
        }

        if (text.length < 200) {
          await sql.query(
            "update crawl_page set status='done', last_crawled_at=now(), content_hash=$2 where url=$1",
            [page.url, sha256(text)],
          );
          result.unchanged += 1;
          continue;
        }

        const newHash = sha256(text);
        if (newHash === page.content_hash) {
          await sql.query("update crawl_page set status='done', last_crawled_at=now() where url=$1", [page.url]);
          result.unchanged += 1;
          continue;
        }

        const pieces = chunkText(text);
        const embeddings = await embedTexts(pieces, "passage");
        const idPrefix = sha256(page.url).slice(0, 16);
        const rows = pieces.map((content, i) => ({
          id: `crawl:${idPrefix}:${i}`,
          content,
          embedding: embeddings[i],
          source_title: title || page.url,
          sourceId: source.id,
        }));
        await replaceChunksForSourceUrl(page.url, rows);

        await sql.query(
          "update crawl_page set status='done', last_crawled_at=now(), content_hash=$2, last_error=null where url=$1",
          [page.url, newHash],
        );
        result.updated += 1;
      } catch (err) {
        result.failed += 1;
        const message = err instanceof Error ? err.message.slice(0, 500) : "خطای ناشناخته";
        await sql.query(
          `update crawl_page
           set status = case when attempts + 1 >= 3 then 'failed' else 'pending' end,
               attempts = attempts + 1,
               last_error = $2,
               last_crawled_at = now()
           where url = $1`,
          [page.url, message],
        );
      }
    }
  }

  const pendingRows = await sql.query<{ n: number }>(
    "select count(*)::int as n from crawl_page where status = 'pending'",
  );
  result.queueRemaining = pendingRows[0]?.n ?? 0;
  return result;
}

export async function crawlerStats() {
  const sql = await getSql();
  const bySource = await sql.query<{ source_id: string; status: string; n: number }>(
    "select source_id, status, count(*)::int as n from crawl_page group by source_id, status order by source_id, status",
  );
  return { bySource };
}
