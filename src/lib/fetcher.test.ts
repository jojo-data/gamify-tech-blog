import { expect, test } from 'vitest'
import { extractArticle } from './fetcher'

const html = `<!DOCTYPE html><html><head><title>Raft 详解</title></head><body>
<nav>导航垃圾</nav>
<article><h1>Raft 详解</h1>${'<p>Raft 是一种共识算法，用日志复制保证一致性。选主依赖任期与心跳超时。</p>'.repeat(10)}</article>
</body></html>`

test('从 HTML 抽取正文', () => {
  const a = extractArticle(html, 'https://blog.example.com/raft')
  expect(a.title).toContain('Raft')
  expect(a.content).toContain('共识算法')
  expect(a.content).not.toContain('导航垃圾')
})

test('空页面抛错', () => {
  expect(() => extractArticle('<html><body></body></html>', 'https://x.com')).toThrow()
})
