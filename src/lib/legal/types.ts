export type SourceType = "statute" | "case_law" | "convention" | "advisory_opinion" | "terminology";

export type SourceFilter = "all" | SourceType;

export type LegalChunk = {
  id: string;
  content: string;
  embedding: number[];
  source_type: SourceType;
  source_title: string | null;
  article_number: string | null;
  law_date: string | null;
  source_url: string | null;
  source_id: string | null;
  hf_dataset: string | null;
};

export type RetrievedChunk = {
  id: string;
  content: string;
  source_type: SourceType;
  source_title: string | null;
  article_number: string | null;
  law_date: string | null;
  source_url: string | null;
  score: number;
};

export function sourceTypeLabelFa(t: SourceType): string {
  switch (t) {
    case "statute":
      return "قانون موضوعه";
    case "case_law":
      return "رأی / رویه قضایی";
    case "convention":
      return "کنوانسیون / معاهده";
    case "advisory_opinion":
      return "نظریه مشورتی";
    case "terminology":
      return "اصطلاح‌نامه حقوقی";
    default:
      return "سند حقوقی";
  }
}

export type AskResult = {
  answer: string;
  sources: RetrievedChunk[];
  usedFallback: boolean;
  model: string;
  embeddingModel: string;
  retrieved: number;
};

export type DraftNextStep = {
  title: string;
  detail: string;
};

export type DraftResult = {
  classification: {
    track: "civil" | "criminal" | "both" | "admin";
    trackLabel: string;
    forum: string;
    formId: string;
    formTitle: string;
    fileVia: string;
    articles: string[];
    reason: string;
    advice: string;
    confidence: "high" | "medium";
    alternatives: { id: string; title: string }[];
  };
  nextSteps: DraftNextStep[];
  draft: string;
  usedModel: boolean;
  model: string;
  embeddingModel: string;
  sources: RetrievedChunk[];
};
