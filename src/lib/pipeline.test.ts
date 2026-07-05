import { expect, test } from 'vitest'
import { createGameFromUrl, regenerateGame, type PipelineDeps } from './pipeline'
import { createDb } from '@/db'
import { articles, games } from '@/db/schema'
import { eq } from 'drizzle-orm'

const profileJson = JSON.stringify({
  category: 'tooling', summary: 's', concepts: [], decisions: [], misconceptions: [],
  takeaways: ['1', '2', '3'], language: 'en',
})
const specJson = JSON.stringify({
  version: 1, mode: 'quiz', title: 'T', intro: 'I', startNodeId: 'q1',
  nodes: [
    { id: 'q1', type: 'question', text: '?', reveal: 'r', next: 'end',
      choices: [{ id: 'a', text: 'A', correct: true, feedback: 'f' }, { id: 'b', text: 'B', feedback: 'f' }] },
    { id: 'end', type: 'end', summary: 'done' },
  ],
})

test('走完流水线并落库', async () => {
  let call = 0
  const deps: PipelineDeps = {
    db: createDb(':memory:'),
    fetchArticle: async url => ({ url, title: '标题', siteName: null, content: '正文' }),
    llm: { async complete() { return call++ === 0 ? profileJson : specJson } },
  }
  const gameId = await createGameFromUrl(deps, 'https://x.com/post')
  const rows = await deps.db.select().from(games)
  expect(rows).toHaveLength(1)
  expect(rows[0].id).toBe(gameId)
})

test('difficulty 透传并落库', async () => {
  let call = 0
  const prompts: string[] = []
  const deps: PipelineDeps = {
    db: createDb(':memory:'),
    fetchArticle: async url => ({ url, title: '标题', siteName: null, content: '正文' }),
    llm: { async complete(p) { prompts.push(p); return call++ === 0 ? profileJson : specJson } },
  }
  const gameId = await createGameFromUrl(deps, 'https://x.com/post', 'expert')
  const [row] = await deps.db.select().from(games).where(eq(games.id, gameId))
  expect(row.difficulty).toBe('expert')
  expect(prompts[1]).toContain('熟悉领域')
})

test('regenerateGame 复用档案生成新游戏', async () => {
  let call = 0
  const db = createDb(':memory:')
  const deps: PipelineDeps = {
    db,
    fetchArticle: async url => ({ url, title: '标题', siteName: null, content: '正文' }),
    llm: { async complete() { return call++ === 0 ? profileJson : specJson } },
  }
  const first = await createGameFromUrl(deps, 'https://x.com/post', 'beginner')
  const second = await regenerateGame({ db, llm: { async complete() { return specJson } } }, first, 'expert')
  expect(second).not.toBe(first)
  const [row] = await db.select().from(games).where(eq(games.id, second))
  expect(row.difficulty).toBe('expert')
  const all = await db.select().from(games)
  expect(all[0].articleId).toBe(all[1].articleId)
})
