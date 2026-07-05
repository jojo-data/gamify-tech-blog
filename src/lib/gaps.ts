import { z } from 'zod'
import { completeJson, type LlmClient } from './llm'
import type { GameHint } from './hints'
import type { NewCard } from './archive'

const CardShape = z.object({
  question: z.string(),
  choices: z.array(z.object({ id: z.string(), text: z.string() })).min(3),
  correctChoiceId: z.string(),
  explanation: z.string(),
})

const TermCardsSchema = z.object({ cards: z.array(CardShape) })

export async function buildTermCards(lite: LlmClient, gaps: GameHint[], language: string): Promise<NewCard[]> {
  if (gaps.length === 0) return []
  const prompt = `You are creating flashcards in English for spaced repetition. The learner asked for help on the items below while playing a learning game (original article language: ${language}). For EACH item, produce one multiple-choice card:
- question: "What is X?"-style, in English; keep non-English terms with the original in parentheses, e.g. "connection pool (连接池)"
- choices: 3 options (one correct summarizing the given explanation, two plausible distractors), ids "a"/"b"/"c"
- correctChoiceId: the correct option id
- explanation: one-sentence English explanation

Items:
${gaps.map((g, i) => `${i + 1}. term/question: ${g.query}\n   explanation given: ${g.explanation}`).join('\n')}

Output ONLY JSON: {"cards":[{"question":"...","choices":[{"id":"a","text":"..."},{"id":"b","text":"..."},{"id":"c","text":"..."}],"correctChoiceId":"a","explanation":"..."}]}`
  const result = await completeJson(lite, prompt, TermCardsSchema)
  return result.cards
}

export type ArchiveTexts = {
  takeaways: string[]
  mistakes: { question: string; reveal: string }[]
  gaps: { query: string; explanation: string }[]
  cards: NewCard[]
}

const ArchiveTextsSchema = z.object({
  takeaways: z.array(z.string()),
  mistakes: z.array(z.object({ question: z.string(), reveal: z.string() })),
  gaps: z.array(z.object({ query: z.string(), explanation: z.string() })),
  cards: z.array(CardShape),
})

export async function translateForArchive(lite: LlmClient, texts: ArchiveTexts, fromLanguage: string): Promise<ArchiveTexts> {
  if (fromLanguage === 'en') return texts
  const prompt = `Translate every string value in the JSON below from ${fromLanguage} to English for a personal knowledge base. Keep technical terms with the original language in parentheses on first mention, e.g. "connection pool (连接池)". Preserve the JSON structure and all ids exactly.

${JSON.stringify(texts)}

Output ONLY the translated JSON with the identical structure.`
  return completeJson(lite, prompt, ArchiveTextsSchema)
}
