import type { AiDraftInput, AiDraftOutput, AiJobFile, RawNewsRecord } from "./types";
import { SITE_DESCRIPTION, SITE_LOCALE, SITE_NAME, SITE_URL } from "@/lib/site";
import { buildStylePromptSection } from "@/lib/style/prompt";
import { toSlug } from "./hash";

export const AI_STYLE_INSTRUCTIONS = `Piszesz krótki news motoryzacyjny dla idrivecars.pl po polsku.
Styl: Marcin Bochenek — konkret, lekka pasja, krótkie akapity, zero clickbaitu i korpo-PR.
Nie kopiuj 1:1 komunikatu prasowego ani zdań z korpusu redakcyjnego — parafrazuj i dodaj kontekst.
Zawsze podaj źródło w treści lub leadzie. Ostrzeż o ograniczeniach licencyjnych zdjęć.
Nie publikuj — zaproponuj status draft lub review.`;

export const AUTO_PUBLISH_CONFIDENCE_THRESHOLD = 0.92;

export function buildAiDraftInput(raw: RawNewsRecord, jobId: string): AiDraftInput {
  return {
    jobId,
    createdAt: new Date().toISOString(),
    raw,
    styleReference: "testy",
    site: {
      name: SITE_NAME,
      locale: SITE_LOCALE,
      baseUrl: SITE_URL
    },
    instructions: AI_STYLE_INSTRUCTIONS
  };
}

export function validateAiDraftOutput(
  input: AiDraftInput,
  output: AiDraftOutput
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (output.jobId !== input.jobId) errors.push("jobId nie zgadza się z wejściem");
  if (!output.title?.trim()) errors.push("Brak tytułu");
  if (!output.lead?.trim()) errors.push("Brak leadu");
  if (!output.bodyMarkdown?.trim()) errors.push("Brak treści");
  if (!output.seo?.metaTitle) errors.push("Brak metaTitle");
  if (!output.seo?.metaDescription) errors.push("Brak metaDescription");
  if (output.confidence < 0 || output.confidence > 1) errors.push("confidence poza 0–1");
  if (!output.licenseWarnings?.length) {
    errors.push("Brak licenseWarnings — model musi wskazać ryzyka prawne");
  }
  return { ok: errors.length === 0, errors };
}

export function resolveStatusAfterAi(output: AiDraftOutput): "draft" | "review" {
  if (output.confidence >= AUTO_PUBLISH_CONFIDENCE_THRESHOLD) {
    return output.suggestedStatus === "draft" ? "draft" : "review";
  }
  return "review";
}

export function suggestSlug(output: AiDraftOutput, publishedAt: string): string {
  return output.seo.slug?.trim() || toSlug(output.title, publishedAt);
}

export function buildAiJobFile(input: AiDraftInput): AiJobFile {
  return { input, status: "pending" };
}

/** Tekst promptu dla lokalnego modelu (Ollama, LM Studio, llama.cpp server). */
export function formatPromptForLocalModel(job: AiJobFile, styleSection?: string): string {
  const { raw, instructions, site } = job.input;
  const imageInfo = raw.images
    .map((img, i) => `- Obraz ${i + 1}: ${img.url}${img.license ? ` (${img.license})` : ""}`)
    .join("\n");

  const styleBlock = styleSection?.trim()
    ? `\n--- PROFIL STYLU (Marcin Bochenek) ---\n${styleSection}\n`
    : "";

  return `${instructions}
${styleBlock}

Witryna: ${site.name} (${site.baseUrl}), locale: ${site.locale}
Opis serwisu: ${SITE_DESCRIPTION}

--- MATERIAŁ ŹRÓDŁOWY ---
Tytuł: ${raw.title}
Źródło: ${raw.sourceName}
URL: ${raw.sourceUrl}
Data: ${raw.publishedAt}
Lead/summary: ${raw.lead ?? "(brak)"}
Treść:
${raw.bodyText ?? raw.bodyHtml ?? "(brak pełnej treści)"}

Zdjęcia:
${imageInfo || "(brak)"}

Licencja / uwagi: ${raw.license.usageNotes}

--- WYMAGANY FORMAT WYJŚCIA (JSON) ---
{
  "jobId": "${job.input.jobId}",
  "title": "...",
  "lead": "...",
  "bodyMarkdown": "...",
  "seo": { "metaTitle": "...", "metaDescription": "...", "keywords": ["..."], "slug": "..." },
  "tags": ["..."],
  "licenseWarnings": ["..."],
  "confidence": 0.0,
  "suggestedStatus": "review"
}`;
}

/** Async: dołącza profil stylu + few-shot dopasowane do tematu newsa. */
export async function formatPromptForLocalModelWithStyle(job: AiJobFile): Promise<string> {
  const { raw } = job.input;
  const styleSection = await buildStylePromptSection({
    title: raw.title,
    lead: raw.lead,
    tags: raw.tags,
    manufacturerId: raw.manufacturerId,
    keywords: raw.title.split(/\s+/).slice(0, 8),
    preferKind: ["news", "felieton"]
  });
  return formatPromptForLocalModel(job, styleSection);
}
