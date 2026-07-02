import type { Db } from '@/db'
import { articles, games } from '@/db/schema'
import type { LlmClient } from './llm'
import type { FetchedArticle } from './fetcher'
import { analyzeArticle } from './analyzer'
import { compileGame } from './compiler'

export type PipelineDeps = {
  llm: LlmClient
  fetchArticle: (url: string) => Promise<FetchedArticle>
  db: Db
}

export async function createGameFromUrl(deps: PipelineDeps, url: string): Promise<number> {
  const article = await deps.fetchArticle(url)
  const profile = await analyzeArticle(deps.llm, article)
  const spec = await compileGame(deps.llm, profile, article.content)
  const gameId = deps.db.transaction((tx) => {
    const articleRow = tx.insert(articles).values({
      url: article.url, title: article.title, siteName: article.siteName,
      content: article.content, fetchedAt: new Date(),
    }).returning().get()
    const gameRow = tx.insert(games).values({
      articleId: articleRow.id, profile, spec, createdAt: new Date(),
    }).returning().get()
    return gameRow.id
  })
  return gameId
}
