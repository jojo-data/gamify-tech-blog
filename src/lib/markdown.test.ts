import { expect, test } from 'vitest'
import { noteToMarkdown } from './markdown'
import { GameSpecSchema } from './gamespec'

const spec = GameSpecSchema.parse({
  version: 1, mode: 'quiz', title: 'T', intro: 'I', startNodeId: 'q1',
  nodes: [
    { id: 'q1', type: 'question', text: '连接池的作用？', reveal: '复用连接', next: 'end',
      choices: [{ id: 'a', text: '对', correct: true, feedback: 'f' }, { id: 'b', text: '错', feedback: 'f' }] },
    { id: 'end', type: 'end', summary: 's' },
  ],
})

test('生成含 frontmatter、双链与错题的 markdown', () => {
  const md = noteToMarkdown({
    title: '连接池详解', url: 'https://x.com/pool', siteName: '某博客',
    createdAt: new Date('2026-07-03T10:00:00Z'),
    profile: {
      category: 'concept', summary: '讲连接池',
      concepts: [{ name: '连接池', definition: '连接的共享池', dependsOn: [] }],
      decisions: [], misconceptions: [], takeaways: ['要点一', '要点二', '要点三'],
    },
    spec,
    answers: [{ nodeId: 'q1', choiceId: 'b', correct: false, scored: true }],
  })
  expect(md).toMatch(/^---\nsource: "https:\/\/x\.com\/pool"\n/)
  expect(md).toContain('[[连接池]]')
  expect(md).toContain('要点一')
  expect(md).toContain('连接池的作用？')   // 错题回顾
  expect(md).toContain('tags:')
})
