import { expect, test } from 'vitest'
import { createDb } from '@/db'
import { articles, games, hints } from '@/db/schema'
import { recordGlossaryHint, answerQuestionHint, listGameHints, listQuestionHints } from './hints'
import type { LlmClient } from './llm'
import type { ChatMessage } from './hints'

async function seedGame(db: ReturnType<typeof createDb>) {
  const [a] = await db.insert(articles).values({ url: 'u', title: 't', content: 'Kafka partitions rebalance...', fetchedAt: new Date() }).returning()
  const [g] = await db.insert(games).values({
    articleId: a.id,
    profile: { language: 'en', category: 'concept', summary: 's', concepts: [], decisions: [], misconceptions: [], takeaways: ['1', '2', '3'] },
    spec: { version: 1, mode: 'quiz', title: 'T', intro: 'I', startNodeId: 'q1', glossary: [],
      nodes: [
        { id: 'q1', type: 'question', text: 'What is a partition?', reveal: 'r', next: 'end', scored: true,
          choices: [{ id: 'a', text: 'A', correct: true, feedback: 'f' }, { id: 'b', text: 'B', correct: false, feedback: 'f' }] },
        { id: 'end', type: 'end', summary: 'done' },
      ] },
    createdAt: new Date(),
  }).returning()
  return g
}

test('glossary 求助同局同术语只记一次', async () => {
  const db = createDb(':memory:')
  const g = await seedGame(db)
  await recordGlossaryHint(db, g.id, 'q1', 'partition', 'a shard of a topic')
  await recordGlossaryHint(db, g.id, 'q1', 'partition', 'a shard of a topic')
  expect(await db.select().from(hints)).toHaveLength(1)
})

test('自由提问带上下文问 LLM 并落库', async () => {
  const db = createDb(':memory:')
  const g = await seedGame(db)
  const prompts: string[] = []
  const lite: LlmClient = { async complete(p) { prompts.push(p); return 'A partition is...' } }
  const answer = await answerQuestionHint(db, lite, g.id, 'q1', 'what is rebalance?')
  expect(answer).toContain('partition')
  expect(prompts[0]).toContain('Kafka partitions rebalance')  // 文章上下文
  expect(prompts[0]).toContain('What is a partition?')        // 节点上下文
  expect(prompts[0]).toContain('what is rebalance?')          // 玩家问题
  expect(prompts[0]).toContain('（en）')                       // 原文语言指令
  const rows = await db.select().from(hints)
  expect(rows).toHaveLength(1)
  expect(rows[0].kind).toBe('question')
})

test('listGameHints 按 query 去重（大小写不敏感）', async () => {
  const db = createDb(':memory:')
  const g = await seedGame(db)
  await recordGlossaryHint(db, g.id, 'q1', 'Partition', 'e1')
  await db.insert(hints).values({ gameId: g.id, nodeId: 'q1', kind: 'question', query: 'partition', explanation: 'e2', createdAt: new Date() })
  expect(await listGameHints(db, g.id)).toHaveLength(1)
})

test('history 拼入 prompt：顺序、前缀、200 条安全网与 2000 字符截断', async () => {
  const db = createDb(':memory:')
  const g = await seedGame(db)
  const prompts: string[] = []
  const lite: LlmClient = { async complete(p) { prompts.push(p); return 'answer' } }
  // 202 条：最旧一轮（dropped-q/dropped-a）应被 200 条安全网裁掉
  const history: ChatMessage[] = [
    { role: 'user', content: 'dropped-q' },
    { role: 'assistant', content: 'dropped-a' },
    ...Array.from({ length: 99 }, (_, i): ChatMessage[] => [
      { role: 'user', content: `kept-q${i}` },
      { role: 'assistant', content: `kept-a${i}` },
    ]).flat(),
    { role: 'user', content: 'recent-q' },
    { role: 'assistant', content: 'x'.repeat(3000) },
  ]
  await answerQuestionHint(db, lite, g.id, 'q1', 'follow-up?', history)
  const p = prompts[0]
  expect(p).toContain('之前的对话')
  expect(p).toContain('玩家：recent-q')
  expect(p).not.toContain('dropped-q')                   // 202 条只留最近 200 条
  expect(p).toContain('玩家：kept-q0')
  expect(p).not.toContain('x'.repeat(2001))              // 单条截 2000
  expect(p.indexOf('之前的对话')).toBeGreaterThan(p.indexOf('文章片段'))
  expect(p.indexOf('之前的对话')).toBeLessThan(p.indexOf('当前游戏情景'))
})

test('history 缺省时 prompt 无对话段（向后兼容）', async () => {
  const db = createDb(':memory:')
  const g = await seedGame(db)
  const prompts: string[] = []
  const lite: LlmClient = { async complete(p) { prompts.push(p); return 'a' } }
  await answerQuestionHint(db, lite, g.id, 'q1', 'q?')
  expect(prompts[0]).not.toContain('之前的对话')
})

test('listQuestionHints 只返回 question、按序、不去重', async () => {
  const db = createDb(':memory:')
  const g = await seedGame(db)
  await recordGlossaryHint(db, g.id, 'q1', 'partition', 'e')
  await db.insert(hints).values({ gameId: g.id, nodeId: 'q1', kind: 'question', query: 'same?', explanation: 'a1', createdAt: new Date() })
  await db.insert(hints).values({ gameId: g.id, nodeId: 'q1', kind: 'question', query: 'same?', explanation: 'a2', createdAt: new Date() })
  const rows = await listQuestionHints(db, g.id)
  expect(rows).toHaveLength(2)
  expect(rows[0].explanation).toBe('a1')
  expect(rows[1].explanation).toBe('a2')
})
