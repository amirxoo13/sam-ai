import type { SourceType } from "./types";

export type Binding =
  | "binding"
  | "binding_if_valid"
  | "binding_on_courts"
  | "persuasive"
  | "advisory"
  | "doctrine";

export type Authority = {
  binding: Binding;
  rank: number;
  labelFa: string;
  shortFa: string;
};

const TITLE = (s: string | null | undefined) => (s ?? "").replace(/ي/g, "ی").replace(/ك/g, "ک");

export function classifyAuthority(sourceType: SourceType, title: string | null): Authority {
  const t = TITLE(title);
  if (sourceType === "statute" && t.includes("اساسی")) {
    return {
      binding: "binding",
      rank: 100,
      labelFa: "الزام‌آور — قانون اساسی",
      shortFa: "قانون اساسی",
    };
  }
  if (sourceType === "convention") {
    return {
      binding: "binding_if_valid",
      rank: 88,
      labelFa: "الزام‌آور در حدود تصویب و الحاق",
      shortFa: "معاهده",
    };
  }
  if (sourceType === "statute" && /آیین.?نامه|تصویب.?نامه|نظامنامه/.test(t)) {
    return {
      binding: "binding_if_valid",
      rank: 70,
      labelFa: "الزام‌آور مگر در صورت مغایرت با قانون",
      shortFa: "آیین‌نامه",
    };
  }
  if (sourceType === "statute") {
    return {
      binding: "binding",
      rank: 90,
      labelFa: "الزام‌آور — قانون عادی",
      shortFa: "قانون",
    };
  }
  if (sourceType === "advisory_opinion") {
    return {
      binding: "advisory",
      rank: 40,
      labelFa: "ارشادی — نظریه مشورتی؛ برای دادگاه لازم‌الاتباع نیست",
      shortFa: "نظریه مشورتی",
    };
  }
  if (sourceType === "terminology") {
    return {
      binding: "doctrine",
      rank: 20,
      labelFa: "غیرالزام‌آور — اصطلاح‌نامه",
      shortFa: "اصطلاح",
    };
  }
  if (t.includes("وحدت رویه") || t.includes("هیأت عمومی") || t.includes("هیئت عمومی")) {
    return {
      binding: "binding_on_courts",
      rank: 80,
      labelFa: "الزام‌آور برای شعب — رأی وحدت رویه / هیأت عمومی",
      shortFa: "وحدت رویه",
    };
  }
  if (sourceType === "case_law") {
    return {
      binding: "persuasive",
      rank: 35,
      labelFa: "غیرالزام‌آور — رویه شعبه؛ فقط جنبه ارشادی دارد",
      shortFa: "رویه شعبه",
    };
  }
  return {
    binding: "persuasive",
    rank: 30,
    labelFa: "وزن حقوقی نامشخص — با متن رسمی مقابله شود",
    shortFa: "سند",
  };
}

export function authorityWeight(a: Authority): number {
  return a.rank / 100;
}
