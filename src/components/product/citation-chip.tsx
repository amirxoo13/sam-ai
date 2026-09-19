import { cn } from "@/lib/utils";
import type { PublicCitation } from "@/lib/legal/types";
import { sourceTypeLabelFa } from "@/lib/legal/types";

const fa = new Intl.NumberFormat("fa-IR");

export function matchKindLabel(kind: PublicCitation["matchKind"]): string {
  if (kind === "exact_article") return "مادهٔ دقیق";
  if (kind === "fts") return "تطبیق متنی";
  return "تطبیق معنایی";
}

/**
 * درصد تطبیق فقط وقتی نشان داده می‌شود که تطبیق مادهٔ دقیق باشد (۱۰۰٪).
 * درصد شباهت برداری به‌عنوان «اطمینان» نمایش داده نمی‌شود —
 * همان سیاست صفحهٔ /sources.
 */
export function matchPercentLabel(kind: PublicCitation["matchKind"]): string | null {
  if (kind === "exact_article") return `${fa.format(100)}٪`;
  return null;
}

export function articleLabel(sourceTitle: string | null, article: string | null): string {
  if (!article) return "";
  const kind = sourceTitle?.includes("اساسی") ? "اصل" : "ماده";
  return `${kind} ${article}`;
}

export function CitationChip({
  citation,
  index,
}: {
  citation: Pick<
    PublicCitation,
    | "id"
    | "source_title"
    | "article_number"
    | "source_url"
    | "source_type"
    | "authorityShort"
    | "authorityLabel"
    | "matchKind"
    | "verified"
    | "quote"
    | "law_date"
  >;
  index?: number;
}) {
  const percent = matchPercentLabel(citation.matchKind);
  const art = articleLabel(citation.source_title, citation.article_number);
  const title = citation.source_title ?? "منبع حقوقی";

  return (
    <li className="rounded-[8px] border border-border bg-elevated px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
        {index != null ? <span>منبع {fa.format(index + 1)}</span> : null}
        <span>{sourceTypeLabelFa(citation.source_type)}</span>
        <span>{citation.authorityShort}</span>
        <span className="rounded-full bg-site-100 px-2 py-0.5 text-[11px] font-medium text-fg">
          {matchKindLabel(citation.matchKind)}
          {percent ? ` · ${percent}` : ""}
        </span>
        {citation.verified ? null : (
          <span className="text-danger">استناد تأییدنشده</span>
        )}
      </div>
      <p className="mt-1.5 text-[13.5px] font-semibold leading-6 text-fg">
        {citation.source_url ? (
          <a
            href={citation.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:underline"
          >
            {title}
            {art ? ` — ${art}` : ""}
            <span className="sr-only"> (باز شدن در زبانهٔ جدید)</span>
          </a>
        ) : (
          <>
            {title}
            {art ? ` — ${art}` : ""}
          </>
        )}
        {citation.law_date ? ` · ${citation.law_date}` : ""}
      </p>
      <p className="mt-0.5 text-[12px] leading-5 text-muted">{citation.authorityLabel}</p>
      {citation.quote ? (
        <p className="mt-1 text-[12.5px] leading-6 text-subtle">{citation.quote}</p>
      ) : null}
    </li>
  );
}

export function PreviewBadge({
  law,
  article,
  percent,
  kind,
}: {
  law: string;
  article: string;
  percent: string;
  kind: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-[8px] border border-border bg-site-50 px-3 py-2 text-[12px]",
      )}
    >
      <span className="font-semibold text-fg">{law}</span>
      <span className="text-muted">{article}</span>
      <span className="rounded-full bg-fg px-2 py-0.5 text-[11px] font-medium text-accent-fg">
        {kind} · {percent}
      </span>
    </div>
  );
}
