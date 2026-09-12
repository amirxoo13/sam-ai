import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { RequireAuth } from "@/components/require-auth";
import { signOut } from "@/lib/auth/client";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { getChatHistory } from "@/lib/chat-history.functions";
import type { ChatMessageRow, ChatType } from "@/lib/chat-history.server";
import { listMyMatters } from "@/lib/matter.functions";
import { deleteMyFile, listMyFiles, uploadUserFile } from "@/lib/user-files.functions";
import type { UserFileSummary } from "@/lib/user-files.server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  component: () => (
    <RequireAuth>
      <ProfilePage />
    </RequireAuth>
  ),
});

function ProfilePage() {
  const user = useCurrentUser();
  const [tab, setTab] = useState<ChatType>("legal");
  const [signingOut, setSigningOut] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <AppHeader active="profile" corpusLabel="پروفایل کاربری" />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        {/* کارت هویت */}
        <section className="mb-6 flex items-center gap-4 rounded-2xl border border-border bg-elevated-2 p-6">
          {user?.profileImageUrl ? (
            <img
              src={user.profileImageUrl}
              alt=""
              className="size-16 shrink-0 rounded-full object-cover"
              style={{ boxShadow: "0 0 0 2px var(--color-accent)" }}
            />
          ) : (
            <span
              className="grid size-16 shrink-0 place-items-center rounded-full text-2xl font-extrabold text-[#1a1305]"
              style={{ background: "linear-gradient(135deg,var(--color-accent-light),var(--color-accent))" }}
            >
              {(user?.displayName ?? user?.primaryEmail ?? "?").charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[18px] font-extrabold text-fg">
              {user?.displayName ?? "کاربر SAM AI"}
            </h1>
            <p className="mt-0.5 truncate text-[13px] text-muted" dir="ltr">
              {user?.primaryEmail}
            </p>
          </div>
          <button
            type="button"
            disabled={signingOut}
            onClick={() => {
              setSigningOut(true);
              void signOut().catch(() => setSigningOut(false));
            }}
            className="shrink-0 rounded-lg border border-border px-3.5 py-2 text-[13px] font-medium text-muted hover:border-danger/50 hover:text-danger disabled:opacity-50"
          >
            {signingOut ? "..." : "خروج از حساب"}
          </button>
        </section>

        {/* پرونده‌های کاربر */}
        <section className="mb-6 rounded-2xl border border-border bg-elevated-2 p-5 sm:p-6">
          <FilesSection />
        </section>

        {/* تاریخچه‌ی مکالمات */}
        <section className="rounded-2xl border border-border bg-elevated-2 p-5 sm:p-6">
          <h2 className="mb-4 text-[14px] font-bold text-fg">تاریخچه‌ی مکالمات</h2>
          <div className="mb-4 flex rounded-lg bg-surface p-1">
            {(
              [
                { id: "legal" as const, label: "چت حقوقی" },
                { id: "residency" as const, label: "چت اقامتی" },
              ]
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex h-10 flex-1 items-center justify-center rounded-md text-[13px] font-medium transition-colors",
                  tab === t.id ? "bg-elevated-2 text-accent-light" : "text-muted hover:text-fg",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <HistoryList chatType={tab} />
        </section>
      </main>
    </div>
  );
}

function FilesSection() {
  const [files, setFiles] = useState<UserFileSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [matters, setMatters] = useState<{ id: string; title: string }[]>([]);
  const [matterId, setMatterId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function refresh() {
    listMyFiles()
      .then(setFiles)
      .catch((err) => setError(err instanceof Error ? err.message : "خطا در بارگذاری پرونده‌ها"));
  }

  useEffect(() => {
    refresh();
    void listMyMatters()
      .then((list) => {
        setMatters(list);
        setMatterId((current) => current ?? list[0]?.id ?? null);
      })
      .catch(() => {
        /* پرونده کاری اختیاری است */
      });
  }, []);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        if (!/\.(txt|md)$/i.test(file.name)) {
          setError("فعلاً فقط فایل‌های متنی (.txt یا .md) پشتیبانی می‌شوند.");
          continue;
        }
        const content = await file.text();
        if (!content.trim()) continue;
        await uploadUserFile({
          data: { filename: file.name, content, matterId: matterId ?? undefined },
        });
      }
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در بارگذاری پرونده");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(id: number) {
    setFiles((prev) => (prev ? prev.filter((f) => f.id !== id) : prev));
    try {
      await deleteMyFile({ data: { id } });
    } catch {
      refresh();
    }
  }

  return (
    <>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-[14px] font-bold text-fg">پرونده‌های کاری</h2>
        <span className="text-[11.5px] text-subtle">فقط شما این فایل‌ها را می‌بینید</span>
      </div>
      <p className="mt-1.5 text-[12.5px] leading-6 text-subtle">
        فایل را به یک پروندهٔ کاری پیوست کنید. سامانه فقط بند مرتبط با پرسش را
        بازیابی می‌کند؛ کل متن به مدل ریخته نمی‌شود.
      </p>
      {matters.length > 0 ? (
        <label className="mt-3 grid gap-1.5">
          <span className="text-[12px] text-muted">پروندهٔ کاری</span>
          <select
            className="h-10 rounded-md border border-border bg-surface px-2 text-sm text-fg"
            value={matterId ?? ""}
            onChange={(e) => setMatterId(e.target.value)}
          >
            {matters.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label
        className={cn(
          "mt-4 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-6 text-center transition-colors",
          uploading ? "border-accent/50 bg-accent/5" : "border-border hover:border-accent/40",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".txt,.md,text/plain"
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
          disabled={uploading}
        />
        <span className="text-[13px] font-medium text-fg">
          {uploading ? "در حال بارگذاری…" : "برای انتخاب فایل کلیک کنید"}
        </span>
        <span className="text-[11.5px] text-subtle">فرمت‌های مجاز: txt، md</span>
      </label>

      {error ? <p className="mt-3 text-[12.5px] text-danger">{error}</p> : null}

      <div className="mt-4 grid gap-2">
        {files === null ? (
          <p className="text-[13px] text-subtle">در حال بارگذاری...</p>
        ) : files.length === 0 ? (
          <p className="text-[13px] text-subtle">هنوز فایلی پیوست نشده است.</p>
        ) : (
          files.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3.5 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-fg">{f.filename}</p>
                <p className="text-[11px] text-subtle">
                  {(f.size / 1024).toFixed(1)} کیلوبایت · {new Date(f.created_at).toLocaleDateString("fa-IR")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void remove(f.id)}
                className="shrink-0 text-[12px] text-subtle hover:text-danger"
              >
                حذف
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function HistoryList({ chatType }: { chatType: ChatType }) {
  const [rows, setRows] = useState<ChatMessageRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);
    getChatHistory({ data: { chatType } })
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "خطا در بارگذاری تاریخچه");
      });
    return () => {
      cancelled = true;
    };
  }, [chatType]);

  if (error) return <p className="text-[13px] text-danger">{error}</p>;
  if (!rows) return <p className="text-[13px] text-subtle">در حال بارگذاری...</p>;
  if (rows.length === 0)
    return <p className="text-[13px] text-subtle">هنوز مکالمه‌ای در این بخش ثبت نشده.</p>;

  return (
    <ol className="grid gap-2.5">
      {rows.map((row) => (
        <li
          key={row.id}
          className={cn(
            "rounded-xl border px-4 py-3 text-[13px] leading-6",
            row.role === "user"
              ? "border-cyan-dim/40 bg-cyan/[0.06] text-fg"
              : "border-border bg-surface text-muted",
          )}
        >
          <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-subtle">
            <span>{row.role === "user" ? "پرسش شما" : "پاسخ SAM AI"}</span>
            <span dir="ltr">{new Date(row.created_at).toLocaleString("fa-IR")}</span>
          </div>
          <p className="whitespace-pre-wrap">
            {row.content.length > 400 ? `${row.content.slice(0, 400)}…` : row.content}
          </p>
        </li>
      ))}
    </ol>
  );
}
