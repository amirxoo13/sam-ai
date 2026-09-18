import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { SiteFooter } from "@/components/site-footer";
import { getCrawlerStats } from "@/lib/crawler/functions";
import { getCorpusStats } from "@/lib/legal/ask.functions";

export const Route = createFileRoute("/sources")({
  loader: async () => ({
    stats: await getCorpusStats().catch(() => ({
      total: 0,
      embedded: 0,
      searchable: 0,
      byType: {} as Record<string, number>,
      byDataset: {} as Record<string, number>,
      backend: "unknown",
    })),
    crawler: await getCrawlerStats().catch(() => ({ bySource: [] })),
  }),
  component: SourcesPage,
});

function SourcesPage() {
  const { stats, crawler } = Route.useLoaderData();
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <AppHeader active="sources" />
      <main id="main" className="container-prose flex-1 py-14 lg:py-20">
        <p className="t-eyebrow">منابع و روش‌شناسی</p>
        <h1 className="t-h1 mt-3 text-fg">بازیابی ماده‌به‌ماده از متن رسمی</h1>
        <p className="t-body mt-5 text-muted">
          نخست شماره ماده و نام قانون تطبیق داده می‌شود، سپس جست‌وجوی متنی
          تمام‌متن، و در صورت وجود بردار واقعی Hugging Face. پاسخ فقط از قطعات
          بازیابی‌شده نوشته می‌شود. ارجاعی که در منبع نباشد علامت می‌خورد. هویت
          اشخاص در پرونده‌های رویه حذف شده است. درصد شباهت برداری به‌عنوان
          اطمینان نمایش داده نمی‌شود.
        </p>

        {/* آمار واقعی پیکره. اگر خواندن شکست بخورد، بلوک اصلاً نمی‌آید —
            عدد صفرِ گمراه‌کننده نمایش داده نمی‌شود. */}
        {stats.total > 0 ? (
          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-7 border-y border-border py-8 sm:grid-cols-3">
            <Stat value={stats.total} label="قطعه در پیکره" />
            <Stat value={stats.embedded} label="بردار معنایی کامل" />
            <Stat value={stats.searchable} label="قطعهٔ قابل جست‌وجو" />
          </dl>
        ) : null}

        <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border">
          <SourceCard
            title="پیکرهٔ حقوقی و کیفری ایران"
            items={[
              "قوانین اصلی ایران (مدنی، مجازات، تجارت، آیین دادرسی، کار، خانواده، اساسی)",
              "قوانین خاص و لوایح قانونی",
              "PDFهای اختبار کانون وکلا",
              "آرای قضایی واقعی",
              "نظریات مشورتی",
            ]}
          />
          <SourceCard
            title="پیکرهٔ اقامتی — اروپا و آمریکا"
            items={[
              "eCFR — Code of Federal Regulations آمریکا",
              "Federal Register آمریکا",
              "CourtListener — آرای قضایی آمریکا",
              "EUR-Lex — قوانین و مقررات اتحادیه اروپا",
            ]}
            links={[
              { href: "https://ecfr.federalregister.gov", label: "eCFR" },
              { href: "https://www.federalregister.gov", label: "Federal Register" },
              { href: "https://www.courtlistener.com", label: "CourtListener" },
              { href: "https://eur-lex.europa.eu", label: "EUR-Lex" },
            ]}
          />
        </div>

        <p className="t-small mt-8 border-s-2 border-n300 ps-5 text-subtle">
          پیکرهٔ حقوقی ایران با یک کرال‌کنندهٔ خودکار و محترمانه (پیرو
          robots.txt) هر چند دقیقه یک دستهٔ کوچک از صفحات جدید یا تغییرکرده را
          می‌خواند و به‌روزرسانی می‌کند. اسناد اقامتی مستقیماً از منابع رسمی بالا
          بازیابی می‌گردند.
        </p>

        {crawler.bySource.length > 0 ? (
          <section className="mt-10" aria-labelledby="crawler-status">
            <h2 id="crawler-status" className="t-h3 text-fg">
              وضعیت کرال‌کننده
            </h2>
            <table className="mt-4 w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border text-start">
                  <th scope="col" className="py-2.5 text-start font-medium text-subtle">
                    منبع و وضعیت
                  </th>
                  <th scope="col" className="py-2.5 text-end font-medium text-subtle">
                    تعداد
                  </th>
                </tr>
              </thead>
              <tbody>
                {crawler.bySource.map((row) => (
                  <tr
                    key={`${row.source_id}-${row.status}`}
                    className="border-b border-border-soft"
                  >
                    <td className="py-2.5 text-muted">
                      {row.source_id} — {row.status}
                    </td>
                    <td className="py-2.5 text-end tabular-nums text-fg">
                      {row.n.toLocaleString("fa-IR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className="block text-[clamp(1.5rem,2.6vw,2rem)] font-medium leading-none tracking-[-0.02em] text-fg tabular-nums">
          {Number(value ?? 0).toLocaleString("fa-IR")}
        </span>
        <span className="t-caption mt-2 block text-muted">{label}</span>
      </dd>
    </div>
  );
}

function SourceCard({
  title,
  items,
  links,
}: {
  title: string;
  items: string[];
  links?: { href: string; label: string }[];
}) {
  return (
    <div className="bg-elevated-2 p-7 sm:p-8">
      <h2 className="t-h3 text-fg">{title}</h2>
      <ul className="mt-4 grid gap-2.5 text-[13.5px] leading-7 text-muted">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span aria-hidden="true" className="mt-3 h-px w-3 shrink-0 bg-n300" />
            <span className="min-w-0 flex-1">{item}</span>
          </li>
        ))}
      </ul>
      {links ? (
        <div className="mt-6 flex flex-wrap gap-2">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-sm border border-border px-3 text-[12.5px] font-medium text-fg transition-colors hover:border-n300 hover:bg-elevated"
              dir="ltr"
            >
              {l.label}
              <ArrowLeft className="size-3 rotate-180" aria-hidden="true" />
              <span className="sr-only"> (باز شدن در زبانهٔ جدید)</span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
