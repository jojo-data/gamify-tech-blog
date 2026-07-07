import { expect, test } from 'vitest'
import { KnowledgeProfileSchema } from './profile'

const base = {
  category: 'concept', summary: 's', concepts: [], decisions: [], misconceptions: [],
  takeaways: ['1', '2', '3'],
}

test('language 缺省为 en', () => {
  expect(KnowledgeProfileSchema.parse(base).language).toBe('en')
})

test('language 显式指定', () => {
  expect(KnowledgeProfileSchema.parse({ ...base, language: 'zh' }).language).toBe('zh')
})
