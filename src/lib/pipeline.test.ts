import { expect, test } from 'vitest'
import { createGameFromUrl, type PipelineDeps } from './pipeline'
import { createDb } from '@/db'
import { games } from '@/db/schema'

const profileJson = JSON.stringify({
  category: 'tooling', summary: 's', concepts: [], decisions: [], misconceptions: [],
  takeaways: ['1', '2', '3'],
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
