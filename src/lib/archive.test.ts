import { expect, test } from 'vitest'
import { buildCards, archivePlay } from './archive'
import { GameSpecSchema } from './gamespec'
import { createDb } from '@/db'
import { articles, games, cards, hints as hintsTable, notes as notesTable } from '@/db/schema'
import type { LlmClient } from './llm'

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

const termCardsJson = JSON.stringify({
  cards: [{
    question: 'What is q-term?',
    choices: [{ id: 'a', text: 'right' }, { id: 'b', text: 'wrong' }, { id: 'c', text: 'wrong too' }],
    correctChoiceId: 'a', explanation: 'exp',
  }],
})

test('归档汇总求助记录：写入 gaps 列并生成术语卡', async () => {
  const db = createDb(':memory:')
  const [a] = await db.insert(articles).values({ url: 'u', title: 't', content: 'c', fetchedAt: new Date() }).returning()
  const [g] = await db.insert(games).values({
    articleId: a.id, spec,
    profile: { language: 'en', category: 'tooling', summary: 's', concepts: [], decisions: [], misconceptions: [], takeaways: ['1', '2', '3'] },
    createdAt: new Date(),
  }).returning()
  await db.insert(hintsTable).values({ gameId: g.id, nodeId: 'q1', kind: 'glossary', query: 'q-term', explanation: 'exp', createdAt: new Date() })
  const lite: LlmClient = { async complete() { return termCardsJson } }
  const noteId = await archivePlay(db, g.id, [{ nodeId: 'q1', choiceId: 'b', correct: false, scored: true }], lite)
  const [note] = await db.select().from(notesTable)
  expect(note.gaps).toEqual([{ query: 'q-term', explanation: 'exp' }])
  expect((note.mistakes as { question: string }[])[0].question).toBe('第一题')
  const cardRows = await db.select().from(cards)
  expect(cardRows).toHaveLength(2)  // 1 错题卡 + 1 术语卡
  expect(cardRows.map(c => c.question)).toContain('What is q-term?')
  expect(noteId).toBeGreaterThan(0)
})

test('术语卡生成失败降级：只有错题卡，归档不受影响', async () => {
  const db = createDb(':memory:')
  const [a] = await db.insert(articles).values({ url: 'u', title: 't', content: 'c', fetchedAt: new Date() }).returning()
  const [g] = await db.insert(games).values({
    articleId: a.id, spec,
    profile: { language: 'en', category: 'tooling', summary: 's', concepts: [], decisions: [], misconceptions: [], takeaways: ['1', '2', '3'] },
    createdAt: new Date(),
  }).returning()
  await db.insert(hintsTable).values({ gameId: g.id, nodeId: 'q1', kind: 'question', query: 'why?', explanation: 'because', createdAt: new Date() })
  const lite: LlmClient = { async complete() { throw new Error('boom') } }
  const noteId = await archivePlay(db, g.id, [{ nodeId: 'q1', choiceId: 'b', correct: false, scored: true }], lite)
  expect(noteId).toBeGreaterThan(0)
  expect(await db.select().from(cards)).toHaveLength(1)
})
