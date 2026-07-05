import { expect, test } from 'vitest'
import { createDb } from '@/db'
import { articles, games, hints } from '@/db/schema'
import { recordGlossaryHint, answerQuestionHint, listGameHints } from './hints'
import type { LlmClient } from './llm'

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
