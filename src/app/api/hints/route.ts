import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb } from '@/db'
import { liteClient } from '@/lib/llm'
import { recordGlossaryHint, answerQuestionHint } from '@/lib/hints'

const HintBodySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('glossary'), gameId: z.number().int().positive(), nodeId: z.string(), query: z.string().min(1).max(200), explanation: z.string().max(2000) }),
  z.object({ kind: z.literal('question'), gameId: z.number().int().positive(), nodeId: z.string(), query: z.string().min(1).max(500) }),
])

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = HintBodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: '参数不合法' }, { status: 400 })
  const db = getDb()
  try {
    if (parsed.data.kind === 'glossary') {
      await recordGlossaryHint(db, parsed.data.gameId, parsed.data.nodeId, parsed.data.query, parsed.data.explanation)
      return NextResponse.json({ ok: true })
    }
    const explanation = await answerQuestionHint(db, liteClient(), parsed.data.gameId, parsed.data.nodeId, parsed.data.query)
    return NextResponse.json({ explanation })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '求助失败' }, { status: 400 })
  }
}
