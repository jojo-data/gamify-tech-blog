import { eq } from 'drizzle-orm'
import type { Db } from '@/db'
import { games, notes, cards } from '@/db/schema'
import { GameSpecSchema, type GameSpec } from './gamespec'
import { KnowledgeProfileSchema } from './profile'
import type { Answer } from './engine'
import { listGameHints } from './hints'
import { buildTermCards, translateForArchive, type ArchiveTexts } from './gaps'
import type { LlmClient } from './llm'

export type NewCard = {
  question: string
  choices: { id: string; text: string }[]
  correctChoiceId: string
  explanation: string
}

export function buildCards(spec: GameSpec, answers: Answer[]): NewCard[] {
  const result: NewCard[] = []
  for (const a of answers) {
    if (!a.scored || a.correct) continue
    const node = spec.nodes.find(n => n.id === a.nodeId)
    if (node?.type !== 'question') continue
    const correct = node.choices.find(c => c.correct)
    if (!correct) continue
    result.push({
      question: node.text,
      choices: node.choices.map(({ id, text }) => ({ id, text })),
      correctChoiceId: correct.id,
      explanation: node.reveal,
    })
  }
  return result
}

export async function archivePlay(db: Db, gameId: number, answers: Answer[], lite?: LlmClient): Promise<number> {
  const [game] = await db.select().from(games).where(eq(games.id, gameId))
  if (!game) throw new Error(`游戏不存在：${gameId}`)
  const spec = GameSpecSchema.parse(game.spec)
  const profile = KnowledgeProfileSchema.parse(game.profile)
  const now = new Date()

  const wrongCards = buildCards(spec, answers)
  const mistakes = answers.filter(a => a.scored && !a.correct).map(a => {
    const node = spec.nodes.find(n => n.id === a.nodeId)
    return node?.type === 'question' ? { question: node.text, reveal: node.reveal } : null
  }).filter((m): m is { question: string; reveal: string } => m !== null)
  const gameHints = await listGameHints(db, gameId)

  let texts: ArchiveTexts = {
    takeaways: profile.takeaways,
    mistakes,
    gaps: gameHints.map(h => ({ query: h.query, explanation: h.explanation })),
    cards: wrongCards,
  }
  let termCards: NewCard[] = []
  if (lite) {
    try {
      termCards = await buildTermCards(lite, gameHints, profile.language)
    } catch (e) { console.error('术语卡生成失败（已跳过）：', e) }
    try {
      texts = await translateForArchive(lite, texts, profile.language)
    } catch (e) { console.error('归档翻译失败（保留原语言）：', e) }
  }

  const allCards = [...texts.cards, ...termCards]
  const noteId = db.transaction((tx) => {
    const note = tx.insert(notes).values({
      gameId, takeaways: texts.takeaways, answers, gaps: texts.gaps, mistakes: texts.mistakes, createdAt: now,
    }).returning().get()
    if (allCards.length > 0) {
      tx.insert(cards).values(allCards.map(c => ({ ...c, noteId: note.id, dueAt: now, streak: 0 }))).run()
    }
    return note.id
  })
  return noteId
}
