import type { Authority } from "./authority.ts";

export type SourceType =
  | "statute"
  | "case_law"
  | "convention"
  | "advisory_opinion"
  | "terminology";

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
  authority: Authority;
  matchKind: "exact_article" | "fts" | "vector";
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

export type PublicCitation = {
  id: string;
  source_type: SourceType;
  source_title: string | null;
  article_number: string | null;
  law_date: string | null;
  source_url: string | null;
  authorityLabel: string;
  authorityShort: string;
  binding: Authority["binding"];
  quote: string;
  matchKind: RetrievedChunk["matchKind"];
  verified: boolean;
};

export type AskEval = {
  retrieval: {
    retrieved: number;
    exactArticleHits: number;
    ftsHits: number;
    vectorHits: number;
    bindingSources: number;
    advisorySources: number;
  };
  answer: {
    cited: number;
    verified: number;
    unverified: number;
  };
};

export type AskResult = {
  answer: string;
  sources: PublicCitation[];
  usedFallback: boolean;
  model: string;
  embeddingModel: string;
  retrieved: number;
  requestId: string;
  unverifiedCites: string[];
  eval: AskEval;
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
    confidence: "high" | "medium" | "none";
    refused: boolean;
    alternatives: { id: string; title: string }[];
  };
  nextSteps: DraftNextStep[];
  draft: string;
  usedModel: boolean;
  model: string;
  embeddingModel: string;
  sources: PublicCitation[];
};
