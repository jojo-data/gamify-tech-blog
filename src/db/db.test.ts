import { expect, test } from 'vitest'
import { createDb } from './index'
import { articles, games as gamesTable, hints, notes as notesTable } from './schema'

test('内存库插入并读回文章', async () => {
  const db = createDb(':memory:')
  await db.insert(articles).values({ url: 'https://a.com/x', title: '测试文章', content: '正文', fetchedAt: new Date() })
  const rows = await db.select().from(articles)
  expect(rows).toHaveLength(1)
  expect(rows[0].title).toBe('测试文章')
})

test('外键约束生效：引用不存在的文章被拒绝', async () => {
  const db = createDb(':memory:')
  await expect(
    db.insert(gamesTable).values({ articleId: 999, profile: {}, spec: {}, createdAt: new Date() }),
  ).rejects.toThrow()
})

test('difficulty 默认 beginner；hints 表可写读且 FK 生效', async () => {
  const db = createDb(':memory:')
  const [a] = await db.insert(articles).values({ url: 'u', title: 't', content: 'c', fetchedAt: new Date() }).returning()
  const [g] = await db.insert(gamesTable).values({ articleId: a.id, profile: {}, spec: {}, createdAt: new Date() }).returning()
  expect(g.difficulty).toBe('beginner')
  await db.insert(hints).values({ gameId: g.id, nodeId: 'n1', kind: 'glossary', query: 'p99', explanation: 'e', createdAt: new Date() })
  const rows = await db.select().from(hints)
  expect(rows).toHaveLength(1)
  await expect(
    db.insert(hints).values({ gameId: 999, nodeId: 'n', kind: 'question', query: 'q', explanation: 'e', createdAt: new Date() }),
  ).rejects.toThrow()
})

test('notes.gaps/mistakes 默认空数组', async () => {
  const db = createDb(':memory:')
  const [a] = await db.insert(articles).values({ url: 'u', title: 't', content: 'c', fetchedAt: new Date() }).returning()
  const [g] = await db.insert(gamesTable).values({ articleId: a.id, profile: {}, spec: {}, createdAt: new Date() }).returning()
  const [n] = await db.insert(notesTable).values({ gameId: g.id, takeaways: [], answers: [], createdAt: new Date() }).returning()
  expect(n.gaps).toEqual([])
  expect(n.mistakes).toEqual([])
})
