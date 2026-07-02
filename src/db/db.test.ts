import { expect, test } from 'vitest'
import { createDb } from './index'
import { articles, games } from './schema'

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
    db.insert(games).values({ articleId: 999, profile: {}, spec: {}, createdAt: new Date() }),
  ).rejects.toThrow()
})
