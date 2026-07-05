import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb } from '@/db'
import { gatewayClient } from '@/lib/llm'
import { regenerateGame } from '@/lib/pipeline'

export const maxDuration = 600

const BodySchema = z.object({ gameId: z.number().int().positive(), difficulty: z.enum(['beginner', 'expert']) })

export async function POST(req: Request) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: '参数不合法' }, { status: 400 })
  try {
    const gameId = await regenerateGame({ db: getDb(), llm: gatewayClient() }, parsed.data.gameId, parsed.data.difficulty)
    return NextResponse.json({ gameId })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '生成失败' }, { status: 400 })
  }
}
