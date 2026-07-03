import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'

export type FetchedArticle = { url: string; title: string; siteName: string | null; content: string }

export function extractArticle(html: string, url: string): FetchedArticle {
  const dom = new JSDOM(html, { url })
  const parsed = new Readability(dom.window.document).parse()
  const content = parsed?.textContent?.trim()
  if (!parsed || !content) throw new Error('无法从页面提取正文，请检查链接或手动粘贴正文')
  return { url, title: parsed.title?.trim() || url, siteName: parsed.siteName ?? null, content }
}

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024
const FETCH_TIMEOUT_MS = 30000

export async function fetchArticle(url: string): Promise<FetchedArticle> {
  const parsed = new URL(url)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('仅支持 http/https 链接')
  }
  const res = await fetch(url, {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; gamify-tech-blog/0.1)' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`抓取失败：HTTP ${res.status}`)
  const contentLength = Number(res.headers.get('content-length'))
  if (contentLength > MAX_RESPONSE_BYTES) throw new Error('页面过大，无法处理')
  const html = await res.text()
  if (html.length > MAX_RESPONSE_BYTES) throw new Error('页面过大，无法处理')
  return extractArticle(html, url)
}
