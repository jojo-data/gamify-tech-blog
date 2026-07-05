import { expect, test } from 'vitest'
import { compileGame, MODE_BY_CATEGORY } from './compiler'
import type { LlmClient } from './llm'
import type { KnowledgeProfile } from './profile'

const profile: KnowledgeProfile = {
  category: 'postmortem', summary: '一次数据库故障', concepts: [], decisions: [],
  misconceptions: [], takeaways: ['a', 'b', 'c'], language: 'en',
}

const validSpec = JSON.stringify({
  version: 1, mode: 'detective', title: 'T', intro: 'I', startNodeId: 's1',
  nodes: [
    { id: 's1', type: 'scene', text: '症状', next: 'end' },
    { id: 'end', type: 'end', summary: '总结' },
  ],
})

const validQuiz = validSpec.replace('"detective"', '"quiz"')

test('按分类路由玩法', () => {
  expect(MODE_BY_CATEGORY.architecture).toBe('decision')
  expect(MODE_BY_CATEGORY.postmortem).toBe('detective')
  expect(MODE_BY_CATEGORY.concept).toBe('prediction')
  expect(MODE_BY_CATEGORY.tooling).toBe('quiz')
})

test('正常编译返回目标模式', async () => {
  const client: LlmClient = { async complete() { return validSpec } }
  const spec = await compileGame(client, profile, '正文')
  expect(spec.mode).toBe('detective')
})

test('目标模式连续失败后降级为 quiz', async () => {
  let calls = 0
  const client: LlmClient = {
    async complete(p) {
      calls++
      return p.includes('快问快答') ? validQuiz : '不是 JSON'
    },
  }
  const spec = await compileGame(client, profile, '正文')
  expect(spec.mode).toBe('quiz')
  expect(calls).toBeGreaterThan(3)
})

test('难度指南与语言指令进入 prompt', async () => {
  const prompts: string[] = []
  const client: LlmClient = { async complete(p) { prompts.push(p); return validSpec } }
  await compileGame(client, { ...profile, language: 'en' }, '正文', 'beginner')
  expect(prompts[0]).toContain('初学者')
  expect(prompts[0]).toContain('原文语言（en）')
  expect(prompts[0]).toContain('glossary')

  prompts.length = 0
  await compileGame(client, { ...profile, language: 'en' }, '正文', 'expert')
  expect(prompts[0]).toContain('熟悉领域')
})

test('难度缺省为 beginner', async () => {
  const prompts: string[] = []
  const client: LlmClient = { async complete(p) { prompts.push(p); return validSpec } }
  await compileGame(client, { ...profile, language: 'en' }, '正文')
  expect(prompts[0]).toContain('初学者')
})
