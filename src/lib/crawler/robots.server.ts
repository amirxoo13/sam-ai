/**
 * حداقلیِ ولی صحیح robots.txt — فقط قوانین برای User-agent: * (و در صورت
 * وجود، بلوک اختصاصی SAMAIBot) را می‌خواند. کش در حافظه به ازای هر
 * invocation سرورless (کافیست، چون هر batch چند ده صفحه بیشتر نیست).
 */

interface RobotsRules {
  disallow: string[];
  allow: string[];
  crawlDelayMs: number;
}

const cache = new Map<string, RobotsRules>();

function parseRobots(text: string, userAgent: string): RobotsRules {
  const lines = text.split(/\r?\n/);
  let currentGroupMatches = false;
  let matchedSpecific = false;
  const disallow: string[] = [];
  const allow: string[] = [];
  let crawlDelayMs = 0;

  for (const rawLine of lines) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      const ua = value.toLowerCase();
      const isSpecific = ua !== "*" && userAgent.toLowerCase().includes(ua);
      const isWildcard = ua === "*";
      // اگر بلوک اختصاصی برای ما پیدا شد، فقط همان معتبر است؛ وگرنه wildcard.
      if (isSpecific) {
        matchedSpecific = true;
        currentGroupMatches = true;
      } else if (isWildcard && !matchedSpecific) {
        currentGroupMatches = true;
      } else {
        currentGroupMatches = false;
      }
      continue;
    }
    if (!currentGroupMatches) continue;
    if (key === "disallow" && value) disallow.push(value);
    else if (key === "allow" && value) allow.push(value);
    else if (key === "crawl-delay") {
      const n = Number(value);
      if (!Number.isNaN(n)) crawlDelayMs = Math.max(crawlDelayMs, n * 1000);
    }
  }
  return { disallow, allow, crawlDelayMs };
}

async function fetchRobots(origin: string, userAgent: string): Promise<RobotsRules> {
  const cached = cache.get(origin);
  if (cached) return cached;
  let rules: RobotsRules = { disallow: [], allow: [], crawlDelayMs: 0 };
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { "User-Agent": userAgent },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const text = await res.text();
      rules = parseRobots(text, userAgent);
    }
    // 404/عدم وجود robots.txt یعنی همه‌چیز مجاز است (طبق استاندارد).
  } catch {
    // شبکه/timeout در دسترسی به robots.txt — برای احتیاط، محافظه‌کارانه اجازه می‌دهیم
    // ولی چیزی کش نمی‌کنیم تا دفعه‌ی بعد دوباره امتحان شود.
    return rules;
  }
  cache.set(origin, rules);
  return rules;
}

function matchesRule(path: string, rule: string): boolean {
  if (!rule) return false;
  // robots.txt به‌صورت prefix-match ساده (بدون regex کامل) کار می‌کند.
  return path.startsWith(rule);
}

export async function isAllowed(url: string, userAgent: string): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const rules = await fetchRobots(parsed.origin, userAgent);
  const path = parsed.pathname + parsed.search;
  const longestAllow = rules.allow.filter((r) => matchesRule(path, r)).sort((a, b) => b.length - a.length)[0];
  const longestDisallow = rules.disallow.filter((r) => matchesRule(path, r)).sort((a, b) => b.length - a.length)[0];
  if (!longestDisallow) return true;
  if (longestAllow && longestAllow.length >= longestDisallow.length) return true;
  return false;
}
