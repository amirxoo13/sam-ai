import { FORM_FIELDS, type FormFieldId } from "@/data/legal-forms";
import { classifyMatter } from "./classify";
import { EMBEDDING_MODEL } from "./config";
import { generateDraftText, QWEN_MODEL } from "./qwen.server";
import { retrieveChunks } from "./retrieve.server";
import type { DraftResult, RetrievedChunk } from "./types";

export type DraftAnswers = Partial<Record<string, string>>;

function fillTemplate(template: string, answers: DraftAnswers): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const v = answers[key as FormFieldId]?.trim();
    return v && v.length > 0 ? v : "………………";
  });
}

export async function runDraft(input: {
  story: string;
  formId?: string;
  answers?: DraftAnswers;
  hasJudgment?: boolean;
}): Promise<DraftResult> {
  const answers: DraftAnswers = { ...(input.answers ?? {}), story: input.story };
  const hasJudgment =
    Boolean(input.hasJudgment) || Boolean(answers.judgment?.trim());
  const cls = classifyMatter({
    story: input.story,
    formId: input.formId,
    hasJudgment,
  });
  const skeleton = fillTemplate(cls.form.template, answers);

  const query = [
    cls.form.title,
    cls.form.articles.join(" "),
    input.story.slice(0, 400),
  ].join(" — ");

  let sources: RetrievedChunk[] = [];
  try {
    sources = await retrieveChunks(query, "all");
  } catch {
    sources = [];
  }

  let draft = skeleton;
  let usedModel = false;
  try {
    const fieldHint = cls.form.fields
      .map((id) => `${FORM_FIELDS[id].label}: ${answers[id]?.trim() || "—"}`)
      .join("\n");
    draft = await generateDraftText({
      formTitle: cls.form.title,
      trackLabel: cls.trackLabel,
      forum: cls.forum,
      articles: cls.form.articles,
      skeleton,
      facts: fieldHint,
      sources,
      nextSteps: cls.nextSteps.map((s) => `${s.title}: ${s.detail}`).join("\n"),
    });
    usedModel = true;
  } catch {
    const steps = cls.nextSteps
      .map((s, i) => `${i + 1}. ${s.title} — ${s.detail}`)
      .join("\n");
    draft = `${skeleton}\n\n—\nگام بعدی ثبت:\n${steps}\n\nپیش‌نویس بر اساس قالب استاندارد تنظیم شد (مدل تولید متن در دسترس نبود). مواد استنادی را با متن قانون در SAM AI مقابله کنید.`;
  }

  return {
    classification: {
      track: cls.track,
      trackLabel: cls.trackLabel,
      forum: cls.forum,
      formId: cls.form.id,
      formTitle: cls.form.title,
      fileVia: cls.form.fileVia,
      articles: cls.form.articles,
      reason: cls.reason,
      advice: cls.advice,
      confidence: cls.confidence,
      alternatives: cls.alternatives.map((f) => ({ id: f.id, title: f.title })),
    },
    nextSteps: cls.nextSteps,
    draft,
    usedModel,
    model: QWEN_MODEL,
    embeddingModel: EMBEDDING_MODEL,
    sources,
  };
}
