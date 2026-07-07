import { generateText } from 'ai'
import type { z } from 'zod'

export type LlmClient = { complete(prompt: string): Promise<string> }

function makeClient(model: string, maxOutputTokens: number): LlmClient {
  return {
    async complete(prompt) {
      const { text } = await generateText({
        model, maxOutputTokens, prompt,
        // 隐式缓存供应商（Google 等）本就自动生效；对 Anthropic 这类显式缓存供应商，
        // 由 Gateway 自动加 cache_control——completeJson 重试与换难度重开时命中文章前缀缓存
        providerOptions: { gateway: { caching: 'auto' } },
      })
      return text
    },
  }
}

// 经 Vercel AI Gateway 路由："provider/model" 字符串即可切换任意模型
export function gatewayClient(): LlmClient {
  return makeClient(process.env.LLM_MODEL ?? 'anthropic/claude-sonnet-5', 16000)
}

// 轻量任务（求助问答/翻译/干扰项）走便宜模型
export function liteClient(): LlmClient {
  return makeClient(process.env.LLM_LITE_MODEL ?? 'google/gemini-3-flash', 4000)
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
