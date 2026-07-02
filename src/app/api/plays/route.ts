import { NextResponse } from 'next/server'
import { getDb } from '@/db'
import { archivePlay } from '@/lib/archive'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body.gameId !== 'number' || !Array.isArray(body.answers)) {
    return NextResponse.json({ error: '参数不合法' }, { status: 400 })
  }
  try {
    const noteId = await archivePlay(getDb(), body.gameId, body.answers)
    return NextResponse.json({ noteId })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '归档失败' }, { status: 400 })
  }
}
