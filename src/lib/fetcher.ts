import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'

export type FetchedArticle = { url: string; title: string; siteName: string | null; content: string }

export function extractArticle(html: string, url: string): FetchedArticle {
  const dom = new JSDOM(html, { url })
  const parsed = new Readability(dom.window.document).parse()
  const content = parsed?.textContent?.trim()
  if (!content) throw new Error('无法从页面提取正文，请检查链接或手动粘贴正文')
  return { url, title: parsed.title?.trim() || url, siteName: parsed.siteName ?? null, content }
}

export async function fetchArticle(url: string): Promise<FetchedArticle> {
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; gamify-tech-blog/0.1)' } })
  if (!res.ok) throw new Error(`抓取失败：HTTP ${res.status}`)
  return extractArticle(await res.text(), url)
}
