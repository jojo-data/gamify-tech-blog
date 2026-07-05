import { expect, test } from 'vitest'
import { buildTermCards, translateForArchive, type ArchiveTexts } from './gaps'
import type { LlmClient } from './llm'

const termCardsJson = JSON.stringify({
  cards: [{
    question: 'What is a connection pool (连接池)?',
    choices: [{ id: 'a', text: 'A reusable set of DB connections' }, { id: 'b', text: 'A network cable bundle' }],
    correctChoiceId: 'a',
    explanation: 'A pre-established, reusable set of connections.',
  }],
})

test('buildTermCards：gaps 为空不调 LLM 直接返回 []', async () => {
  let called = 0
  const lite: LlmClient = { async complete() { called++; return termCardsJson } }
  expect(await buildTermCards(lite, [], 'zh')).toEqual([])
  expect(called).toBe(0)
})

test('buildTermCards：生成英文选择题卡', async () => {
  const prompts: string[] = []
  const lite: LlmClient = { async complete(p) { prompts.push(p); return termCardsJson } }
  const cards = await buildTermCards(lite, [{ kind: 'glossary', query: '连接池', explanation: '复用的数据库连接' }], 'zh')
  expect(cards).toHaveLength(1)
  expect(cards[0].correctChoiceId).toBe('a')
  expect(prompts[0]).toContain('连接池')
  expect(prompts[0]).toContain('English')
})

test('translateForArchive：英文原文直接原样返回', async () => {
  let called = 0
  const lite: LlmClient = { async complete() { called++; return '{}' } }
  const texts: ArchiveTexts = { takeaways: ['a'], mistakes: [], gaps: [], cards: [] }
  expect(await translateForArchive(lite, texts, 'en')).toBe(texts)
  expect(called).toBe(0)
})

test('translateForArchive：非英文整体翻译', async () => {
  const translated: ArchiveTexts = {
    takeaways: ['Slow queries drain the pool'],
    mistakes: [{ question: 'Root cause?', reveal: 'Pool exhaustion' }],
    gaps: [{ query: 'connection pool (连接池)', explanation: 'Reusable connections' }],
    cards: [],
  }
  const lite: LlmClient = { async complete() { return JSON.stringify(translated) } }
  const input: ArchiveTexts = {
    takeaways: ['慢查询拖垮连接池'],
    mistakes: [{ question: '根因是？', reveal: '连接池耗尽' }],
    gaps: [{ query: '连接池', explanation: '可复用的连接' }],
    cards: [],
  }
  const out = await translateForArchive(lite, input, 'zh')
  expect(out.takeaways[0]).toContain('Slow queries')
})
