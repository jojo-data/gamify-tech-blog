import { and, eq } from 'drizzle-orm'
import type { Db } from '@/db'
import { hints, games, articles } from '@/db/schema'
import type { LlmClient } from './llm'
import { GameSpecSchema } from './gamespec'
import { KnowledgeProfileSchema } from './profile'

export async function recordGlossaryHint(db: Db, gameId: number, nodeId: string, term: string, explanation: string): Promise<void> {
  const existing = await db.select().from(hints)
    .where(and(eq(hints.gameId, gameId), eq(hints.kind, 'glossary'), eq(hints.query, term))).limit(1)
  if (existing.length > 0) return
  await db.insert(hints).values({ gameId, nodeId, kind: 'glossary', query: term, explanation, createdAt: new Date() })
}

export async function answerQuestionHint(
  db: Db, lite: LlmClient, gameId: number, nodeId: string, question: string,
): Promise<string> {
  const [row] = await db.select({ game: games, article: articles })
    .from(games).innerJoin(articles, eq(games.articleId, articles.id))
    .where(eq(games.id, gameId))
  if (!row) throw new Error('游戏不存在')
  const spec = GameSpecSchema.parse(row.game.spec)
  const profile = KnowledgeProfileSchema.parse(row.game.profile)
  const node = spec.nodes.find(n => n.id === nodeId)
  const nodeText = node && 'text' in node ? node.text : ''
  const prompt = `你是一名耐心的技术导师。玩家在一个基于下面文章的学习游戏中遇到看不懂的地方。用文章的原文语言（${profile.language}）、面向初学者的白话回答，150 词以内，只解释概念与背景，不要剧透游戏题目的答案。

文章片段：
${row.article.content.slice(0, 20000)}

当前游戏情景：
${nodeText}

玩家的问题：${question}`
  const explanation = await lite.complete(prompt)
  await db.insert(hints).values({ gameId, nodeId, kind: 'question', query: question, explanation, createdAt: new Date() })
  return explanation
}

export type GameHint = { kind: string; query: string; explanation: string }

export async function listGameHints(db: Db, gameId: number): Promise<GameHint[]> {
  const rows = await db.select().from(hints).where(eq(hints.gameId, gameId))
  const seen = new Set<string>()
  const result: GameHint[] = []
  for (const r of rows) {
    const key = r.query.trim().toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push({ kind: r.kind, query: r.query, explanation: r.explanation })
  }
  return result
}
