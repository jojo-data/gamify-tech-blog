import Anthropic from '@anthropic-ai/sdk'
import type { z } from 'zod'

export type LlmClient = { complete(prompt: string): Promise<string> }

export function anthropicClient(): LlmClient {
  const client = new Anthropic()
  const model = process.env.ANTHROPIC_MODEL ?? 'claude-fable-5'
  return {
    async complete(prompt) {
      const msg = await client.messages.create({
        model, max_tokens: 16000,
        messages: [{ role: 'user', content: prompt }],
      })
      return msg.content.filter(b => b.type === 'text').map(b => b.text).join('')
    },
  }
}

function extractJson(raw: string): unknown {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end <= start) throw new Error('输出中未找到 JSON 对象')
  return JSON.parse(raw.slice(start, end + 1))
}

export async function completeJson<T>(
  client: LlmClient, prompt: string, schema: z.ZodType<T>, retries = 2,
): Promise<T> {
  let lastError = ''
  for (let attempt = 0; attempt <= retries; attempt++) {
    const p = attempt === 0
      ? prompt
      : `${prompt}\n\n你上一次的输出未通过校验：${lastError}\n请修正问题后重新输出完整 JSON（不要输出 JSON 以外的内容）。`
    const raw = await client.complete(p)
    try {
      const parsed = schema.safeParse(extractJson(raw))
      if (parsed.success) return parsed.data
      lastError = JSON.stringify(parsed.error.issues.slice(0, 5))
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e)
    }
  }
  throw new Error(`LLM 输出连续 ${retries + 1} 次未通过校验：${lastError}`)
}
