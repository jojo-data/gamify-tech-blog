import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { cards } from '@/db/schema'
import { nextReview } from '@/lib/srs'

export async function POST(req: Request, { params }: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await params
  const { choiceId } = await req.json().catch(() => ({}))
  const db = getDb()
  const [card] = await db.select().from(cards).where(eq(cards.id, Number(cardId)))
  if (!card) return NextResponse.json({ error: '卡片不存在' }, { status: 404 })
  const correct = choiceId === card.correctChoiceId
  const { streak, dueAt } = nextReview(card.streak, correct, new Date())
  await db.update(cards).set({ streak, dueAt }).where(eq(cards.id, card.id))
  return NextResponse.json({ correct })
}
