import { eq } from 'drizzle-orm'
import type { Db } from '@/db'
import { games, notes, cards } from '@/db/schema'
import { GameSpecSchema, type GameSpec } from './gamespec'
import { KnowledgeProfileSchema } from './profile'
import type { Answer } from './engine'

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

export async function archivePlay(db: Db, gameId: number, answers: Answer[]): Promise<number> {
  const [game] = await db.select().from(games).where(eq(games.id, gameId))
  if (!game) throw new Error(`游戏不存在：${gameId}`)
  const spec = GameSpecSchema.parse(game.spec)
  const profile = KnowledgeProfileSchema.parse(game.profile)
  const now = new Date()
  const [note] = await db.insert(notes).values({
    gameId, takeaways: profile.takeaways, answers, createdAt: now,
  }).returning()
  const newCards = buildCards(spec, answers)
  if (newCards.length > 0) {
    await db.insert(cards).values(newCards.map(c => ({ ...c, noteId: note.id, dueAt: now, streak: 0 })))
  }
  return note.id
}
