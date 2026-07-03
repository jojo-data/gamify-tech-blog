import { NextResponse } from 'next/server'
import { getDb } from '@/db'
import { gatewayClient } from '@/lib/llm'
import { fetchArticle } from '@/lib/fetcher'
import { createGameFromUrl } from '@/lib/pipeline'

export const maxDuration = 600

export async function POST(req: Request) {
  const { url } = await req.json().catch(() => ({}))
  if (typeof url !== 'string' || !url.startsWith('http')) {
    return NextResponse.json({ error: '请提供合法的文章 URL' }, { status: 400 })
  }
  try {
    const gameId = await createGameFromUrl({ db: getDb(), llm: gatewayClient(), fetchArticle }, url)
    return NextResponse.json({ gameId })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : '生成失败' }, { status: 400 })
  }
}
