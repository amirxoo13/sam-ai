import { normalizeFa } from "./article-query.ts";

export const REFUSE_RE =
  /تجاوز(?:\s+جنسی)?|تجاوز به عنف|جرائم? منافی عفت|مواد مخدر|اعتیاد به مواد|قاچاق مواد/;

export function shouldRefuseDraft(story: string): boolean {
  return REFUSE_RE.test(normalizeFa(story));
}
