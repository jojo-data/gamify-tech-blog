import { expect, test } from 'vitest'
import { analyzeArticle } from './analyzer'
import type { LlmClient } from './llm'

const profile = {
  category: 'concept', summary: '讲 Raft',
  concepts: [{ name: 'Raft', definition: '共识算法', dependsOn: [] }],
  decisions: [], misconceptions: [],
  takeaways: ['要点1', '要点2', '要点3'],
}

test('返回校验后的 profile，prompt 含正文与标题', async () => {
  const prompts: string[] = []
  const client: LlmClient = { async complete(p) { prompts.push(p); return JSON.stringify(profile) } }
  const result = await analyzeArticle(client, {
    url: 'https://x.com/raft', title: 'Raft 详解', siteName: null, content: 'Raft 是共识算法……',
  })
  expect(result.category).toBe('concept')
  expect(prompts[0]).toContain('Raft 详解')
  expect(prompts[0]).toContain('Raft 是共识算法')
})

test('prompt 要求语言检测与原文语言产出，返回 language', async () => {
  const prompts: string[] = []
  const client: LlmClient = {
    async complete(p) { prompts.push(p); return JSON.stringify({ ...profile, language: 'en' }) },
  }
  const result = await analyzeArticle(client, {
    url: 'https://x.com/scale', title: 'How OpenAI scales', siteName: null, content: 'Voice models...',
  })
  expect(result.language).toBe('en')
  expect(prompts[0]).toContain('language')
  expect(prompts[0]).toContain('原文语言')
})
