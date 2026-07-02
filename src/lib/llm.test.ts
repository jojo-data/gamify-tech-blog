import { expect, test } from 'vitest'
import { z } from 'zod'
import { completeJson, type LlmClient } from './llm'

const schema = z.object({ name: z.string() })

function fake(responses: string[]): LlmClient & { prompts: string[] } {
  const prompts: string[] = []
  return { prompts, async complete(p) { prompts.push(p); return responses[prompts.length - 1] } }
}

test('首次即合法直接返回', async () => {
  const c = fake(['前置废话 {"name":"ok"} 后置'])
  expect(await completeJson(c, 'prompt', schema)).toEqual({ name: 'ok' })
})

test('非法输出后带错误重试并成功', async () => {
  const c = fake(['{"name":123}', '{"name":"fixed"}'])
  expect(await completeJson(c, 'prompt', schema)).toEqual({ name: 'fixed' })
  expect(c.prompts[1]).toContain('未通过校验')
})

test('重试耗尽抛错', async () => {
  const c = fake(['垃圾', '垃圾', '垃圾'])
  await expect(completeJson(c, 'prompt', schema, 2)).rejects.toThrow('未通过校验')
})
