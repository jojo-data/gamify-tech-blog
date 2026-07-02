import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb } from '@/db'
import { archivePlay } from '@/lib/archive'

const PlayBodySchema = z.object({
  gameId: z.number().int().positive(),
  answers: z.array(z.object({
    nodeId: z.string(),
    choiceId: z.string(),
    correct: z.boolean(),
    scored: z.boolean(),
  })),
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: '参数不合法' }, { status: 400 })
  }

  const parseResult = PlayBodySchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json({ error: '参数不合法' }, { status: 400 })
  }

  try {
    const noteId = await archivePlay(getDb(), parseResult.data.gameId, parseResult.data.answers)
    return NextResponse.json({ noteId })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '归档失败' }, { status: 400 })
  }
}
