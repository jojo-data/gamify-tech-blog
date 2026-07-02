import { expect, test } from 'vitest'
import { buildCards, archivePlay } from './archive'
import { GameSpecSchema } from './gamespec'
import { createDb } from '@/db'
import { articles, games, cards } from '@/db/schema'

const spec = GameSpecSchema.parse({
  version: 1, mode: 'quiz', title: 'T', intro: 'I', startNodeId: 'q1',
  nodes: [
    { id: 'q1', type: 'question', text: '第一题', reveal: '解析1', next: 'q2',
      choices: [{ id: 'a', text: 'A', correct: true, feedback: 'f' }, { id: 'b', text: 'B', feedback: 'f' }] },
    { id: 'q2', type: 'question', text: '第二题', scored: false, reveal: '解析2', next: 'end',
      choices: [{ id: 'a', text: 'A', feedback: 'f' }, { id: 'b', text: 'B', feedback: 'f' }] },
    { id: 'end', type: 'end', summary: 'done' },
  ],
})

test('仅计分且答错的题生成卡片', () => {
  const result = buildCards(spec, [
    { nodeId: 'q1', choiceId: 'b', correct: false, scored: true },
    { nodeId: 'q2', choiceId: 'a', correct: false, scored: false },
  ])
  expect(result).toHaveLength(1)
  expect(result[0]).toMatchObject({ question: '第一题', correctChoiceId: 'a', explanation: '解析1' })
  expect(result[0].choices.map(c => c.id)).toEqual(['a', 'b'])
})

test('archivePlay 落库并立即到期', async () => {
  const db = createDb(':memory:')
  const [a] = await db.insert(articles).values({ url: 'u', title: 't', content: 'c', fetchedAt: new Date() }).returning()
  const [g] = await db.insert(games).values({
    articleId: a.id, spec,
    profile: { category: 'tooling', summary: 's', concepts: [], decisions: [], misconceptions: [], takeaways: ['1', '2', '3'] },
    createdAt: new Date(),
  }).returning()
  const noteId = await archivePlay(db, g.id, [{ nodeId: 'q1', choiceId: 'b', correct: false, scored: true }])
  expect(noteId).toBeGreaterThan(0)
  const cardRows = await db.select().from(cards)
  expect(cardRows).toHaveLength(1)
  expect(+cardRows[0].dueAt).toBeLessThanOrEqual(Date.now())
})
