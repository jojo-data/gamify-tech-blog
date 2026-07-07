import { and, asc, eq } from 'drizzle-orm'
import type { Db } from '@/db'
import { hints, games, articles } from '@/db/schema'
import type { LlmClient } from './llm'
import { GameSpecSchema } from './gamespec'
import { KnowledgeProfileSchema } from './profile'

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

// 安全网而非功能限制：200 条 × 2000 字符（历史 ≈10 万 token）+ 文章 20 万字符（≈5 万 token），
// 单次请求稳在 20 万 token 内；隐式前缀缓存让文章部分在多轮中按缓存价计费。
export const ARTICLE_MAX_CHARS = 200_000
export const HISTORY_MAX_MESSAGES = 200
export const HISTORY_MESSAGE_MAX_CHARS = 2_000

export async function recordGlossaryHint(db: Db, gameId: number, nodeId: string, term: string, explanation: string): Promise<void> {
  const existing = await db.select().from(hints)
    .where(and(eq(hints.gameId, gameId), eq(hints.kind, 'glossary'), eq(hints.query, term))).limit(1)
  if (existing.length > 0) return
  await db.insert(hints).values({ gameId, nodeId, kind: 'glossary', query: term, explanation, createdAt: new Date() })
}

export async function answerQuestionHint(
  db: Db, lite: LlmClient, gameId: number, nodeId: string, question: string, history: ChatMessage[] = [],
): Promise<string> {
  const [row] = await db.select({ game: games, article: articles })
    .from(games).innerJoin(articles, eq(games.articleId, articles.id))
    .where(eq(games.id, gameId))
  if (!row) throw new Error('游戏不存在')
  const spec = GameSpecSchema.parse(row.game.spec)
  const profile = KnowledgeProfileSchema.parse(row.game.profile)
  const node = spec.nodes.find(n => n.id === nodeId)
  const nodeText = node && 'text' in node ? node.text : ''
  const trimmed = history.slice(-HISTORY_MAX_MESSAGES).map(m => ({ role: m.role, content: m.content.slice(0, HISTORY_MESSAGE_MAX_CHARS) }))
  const historyBlock = trimmed.length > 0
    ? `\n之前的对话：\n${trimmed.map(m => `${m.role === 'user' ? '玩家' : '导师'}：${m.content}`).join('\n')}\n`
    : ''
  const prompt = `你是一名耐心的技术导师。玩家在一个基于下面文章的学习游戏中遇到看不懂的地方。用文章的原文语言（${profile.language}）、面向初学者的白话回答，150 词以内，只解释概念与背景，不要剧透游戏题目的答案。如果玩家在追问，请承接上文继续深入。

文章片段：
${row.article.content.slice(0, ARTICLE_MAX_CHARS)}
${historyBlock}
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

export type QuestionHint = { nodeId: string; query: string; explanation: string; createdAt: Date }

export async function listQuestionHints(db: Db, gameId: number): Promise<QuestionHint[]> {
  const rows = await db.select().from(hints)
    .where(and(eq(hints.gameId, gameId), eq(hints.kind, 'question')))
    .orderBy(asc(hints.id))
  return rows.map(r => ({ nodeId: r.nodeId, query: r.query, explanation: r.explanation, createdAt: r.createdAt }))
}
