import { createFileRoute } from "@tanstack/react-router";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { getCrawlerStats } from "@/lib/crawler/functions";
import { getCorpusStats } from "@/lib/legal/ask.functions";

export const Route = createFileRoute("/sources")({
  loader: async () => ({
    stats: await getCorpusStats().catch(() => ({
      total: 0,
      embedded: 0,
      searchable: 0,
      byType: {} as Record<string, number>,
    })),
    crawler: await getCrawlerStats().catch(() => ({ bySource: [] })),
  }),
  component: SourcesPage,
});

function SourcesPage() {
  const { stats, crawler } = Route.useLoaderData();
  return (
    <div className="site-surface flex min-h-dvh flex-col">
      <MarketingHeader active="sources" />
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 lg:px-10">
        <p className="mb-3 text-[12px] font-semibold tracking-[0.18em] text-site-500">
          منابع و روش‌شناسی
        </p>
        <h1 className="text-[2rem] font-extrabold leading-[1.35] tracking-tight text-fg sm:text-[2.5rem] sm:leading-[1.2]">
          بازیابی ماده‌به‌ماده از متن رسمی
        </h1>
        <p className="mt-5 text-[15px] leading-8 text-muted">
          نخست شماره ماده و نام قانون تطبیق داده می‌شود، سپس جستجوی متنی تمام‌متن،
          و در صورت وجود بردار واقعی Hugging Face. پاسخ فقط از قطعات بازیابی‌شده
          نوشته می‌شود. ارجاعی که در منبع نباشد علامت می‌خورد. هویت اشخاص در
          پرونده‌های رویه حذف شده است. درصد شباهت برداری به‌عنوان اطمینان نمایش
          داده نمی‌شود.
        </p>

        <div className="mt-10 grid gap-4">
          <SourceCard
            title="پیکره‌ی حقوقی و کیفری ایران"
            stat={`${stats.total.toLocaleString("fa-IR")} قطعه · ${Number(stats.embedded ?? 0).toLocaleString("fa-IR")} بردار کامل`}
            items={[
              "قوانین اصلی ایران (مدنی، مجازات، تجارت، آیین دادرسی، کار، خانواده، اساسی)",
              "قوانین خاص و لوایح قانونی",
              "PDFهای اختبار کانون وکلا",
              "آرای قضایی واقعی",
              "نظریات مشورتی",
            ]}
          />
          <SourceCard
            title="پیکره‌ی اقامتی — اروپا و آمریکا"
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

        <p className="mt-8 rounded-[12px] border border-border bg-elevated p-4 text-[13.5px] leading-7 text-subtle">
          پیکره‌ی حقوقی ایران با یک کرال‌کننده‌ی خودکار و محترمانه (پیرو
          robots.txt) هر چند دقیقه یک دسته‌ی کوچک از صفحات جدید یا
          تغییرکرده را می‌خواند و به‌روزرسانی می‌کند. اسناد اقامتی مستقیماً
          از منابع رسمی بالا بازیابی می‌گردند.
        </p>

        {crawler.bySource.length > 0 ? (
          <div className="mt-4 rounded-[12px] border border-border bg-elevated p-4">
            <p className="mb-2 text-[12px] font-bold text-fg">وضعیت کرال‌کننده</p>
            <div className="grid gap-1.5 text-[12px] text-subtle" dir="ltr">
              {crawler.bySource.map((row) => (
                <div key={`${row.source_id}-${row.status}`} className="flex justify-between" dir="rtl">
                  <span>
                    {row.source_id} — {row.status}
                  </span>
                  <span className="tabular-nums text-fg">{row.n.toLocaleString("fa-IR")}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </main>
      <MarketingFooter />
    </div>
  );
}

function SourceCard({
  title,
  stat,
  items,
  links,
}: {
  title: string;
  stat?: string;
  items: string[];
  links?: { href: string; label: string }[];
}) {
  return (
    <div className="rounded-[12px] border border-border bg-elevated p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-extrabold text-fg">{title}</h2>
        {stat ? <span className="text-[12px] text-muted">{stat}</span> : null}
      </div>
      <ul className="grid gap-2 text-[13.5px] leading-6 text-muted">
        {items.map((item) => (
          <li key={item}>— {item}</li>
        ))}
      </ul>
      {links ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center rounded-[8px] border border-border bg-site-50 px-3 text-[12px] text-muted hover:text-fg"
              dir="ltr"
            >
              {l.label}
              <span className="sr-only"> (باز شدن در زبانهٔ جدید)</span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
