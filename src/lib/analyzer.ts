import { completeJson, type LlmClient } from './llm'
import { KnowledgeProfileSchema, type KnowledgeProfile } from './profile'
import type { FetchedArticle } from './fetcher'

const MAX_CHARS = 60000

export async function analyzeArticle(client: LlmClient, article: FetchedArticle): Promise<KnowledgeProfile> {
  const content = article.content.length > MAX_CHARS
    ? article.content.slice(0, MAX_CHARS) + '\n……（正文过长已截断）'
    : article.content
  const prompt = `你是一名技术学习设计师。请阅读下面的技术博客，产出一份中文「知识档案」JSON。

要求：
- language：文章正文的主要语言，BCP-47 短码（如 en、zh、ja）；无法判断时用 en
- 除 language 外的所有产出字段（summary/concepts/decisions/misconceptions/takeaways）必须使用文章的原文语言书写
- category：文章类型，architecture（系统架构/工程实践）| concept（概念/原理讲解）| postmortem（故障复盘/踩坑）| tooling（新技术/工具介绍）四选一
- summary：两三句话概括文章
- concepts：文中核心概念（name/definition/dependsOn，dependsOn 引用其它概念的 name）
- decisions：文中的关键技术决策（situation/options/chosen/rationale）；概念讲解类可为空数组
- misconceptions：读者容易想错的地方（wrong/right），用于日后出题
- takeaways：3-5 条核心要点

只输出 JSON，字段结构如下：
{"language":"en","category":"...","summary":"...","concepts":[{"name":"...","definition":"...","dependsOn":[]}],"decisions":[{"situation":"...","options":["..."],"chosen":"...","rationale":"..."}],"misconceptions":[{"wrong":"...","right":"..."}],"takeaways":["..."]}

文章标题：${article.title}
文章正文：
${content}`
  return completeJson(client, prompt, KnowledgeProfileSchema)
}
