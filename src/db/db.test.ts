import { expect, test } from 'vitest'
import { createDb } from './index'
import { articles } from './schema'

test('内存库插入并读回文章', async () => {
  const db = createDb(':memory:')
  await db.insert(articles).values({ url: 'https://a.com/x', title: '测试文章', content: '正文', fetchedAt: new Date() })
  const rows = await db.select().from(articles)
  expect(rows).toHaveLength(1)
  expect(rows[0].title).toBe('测试文章')
})
