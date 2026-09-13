import { createFileRoute } from "@tanstack/react-router";
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
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <p className="mb-2 text-[12px] font-bold tracking-[0.18em] text-accent uppercase">
          منابع و روش‌شناسی
        </p>
        <h1 className="text-[26px] font-extrabold leading-[1.4]">
          بازیابی ماده‌به‌ماده از متن رسمی
        </h1>
        <p className="mt-4 text-[14px] leading-8 text-muted">
          نخست شماره ماده و نام قانون تطبیق داده می‌شود، سپس جستجوی متنی تمام‌متن،
          و در صورت وجود بردار واقعی Hugging Face. پاسخ فقط از قطعات بازیابی‌شده
          نوشته می‌شود. ارجاعی که در منبع نباشد علامت می‌خورد. هویت اشخاص در
          پرونده‌های رویه حذف شده است. درصد شباهت برداری به‌عنوان اطمینان نمایش
          داده نمی‌شود.
        </p>

        <div className="mt-8 grid gap-4">
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

        <p className="mt-8 rounded-xl border border-border bg-elevated-2 p-4 text-[13px] leading-6 text-subtle">
          پیکره‌ی حقوقی ایران با یک کرال‌کننده‌ی خودکار و محترمانه (پیرو
          robots.txt) هر چند دقیقه یک دسته‌ی کوچک از صفحات جدید یا
          تغییرکرده را می‌خواند و به‌روزرسانی می‌کند. اسناد اقامتی مستقیماً
          از منابع رسمی بالا بازیابی می‌گردند.
        </p>

        {crawler.bySource.length > 0 ? (
          <div className="mt-4 rounded-xl border border-border bg-elevated-2 p-4">
            <p className="mb-2 text-[12px] font-bold text-fg">وضعیت کرال‌کننده</p>
            <div className="grid gap-1.5 text-[12px] text-subtle" dir="ltr">
              {crawler.bySource.map((row) => (
                <div key={`${row.source_id}-${row.status}`} className="flex justify-between" dir="rtl">
                  <span>{row.source_id} — {row.status}</span>
                  <span className="tabular-nums text-fg">{row.n.toLocaleString("fa-IR")}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </main>
      <SiteFooter />
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
    <div className="rounded-2xl border border-border bg-elevated-2 p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-bold text-fg">{title}</h2>
        {stat ? <span className="text-[12px] text-accent">{stat}</span> : null}
      </div>
      <ul className="grid gap-2 text-[13px] leading-6 text-muted">
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
              className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-[12px] text-muted hover:text-fg"
              dir="ltr"
            >
              {l.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
