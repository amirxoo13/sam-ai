/** فقط نشانی http(s) قابل کلیک و قابل راستی‌آزمایی است — مسیر فایل محلی لینک نمی‌شود. */
export function isOfficialUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
