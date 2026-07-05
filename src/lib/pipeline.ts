import type { Db } from '@/db'
import { articles, games } from '@/db/schema'
import type { LlmClient } from './llm'
import type { FetchedArticle } from './fetcher'
import { analyzeArticle } from './analyzer'
import { compileGame } from './compiler'
import type { Difficulty } from './compiler'
import { KnowledgeProfileSchema } from './profile'
import { eq } from 'drizzle-orm'

export type PipelineDeps = {
  llm: LlmClient
  fetchArticle: (url: string) => Promise<FetchedArticle>
  db: Db
}

export async function createGameFromUrl(deps: PipelineDeps, url: string, difficulty: Difficulty = 'beginner'): Promise<number> {
  const article = await deps.fetchArticle(url)
  const profile = await analyzeArticle(deps.llm, article)
  const spec = await compileGame(deps.llm, profile, article.content, difficulty)
  const gameId = deps.db.transaction((tx) => {
    const articleRow = tx.insert(articles).values({
      url: article.url, title: article.title, siteName: article.siteName,
      content: article.content, fetchedAt: new Date(),
    }).returning().get()
    const gameRow = tx.insert(games).values({
      articleId: articleRow.id, profile, spec, difficulty, createdAt: new Date(),
    }).returning().get()
    return gameRow.id
  })
  return gameId
}

export async function regenerateGame(
  deps: { db: Db; llm: LlmClient }, gameId: number, difficulty: Difficulty,
): Promise<number> {
  const [row] = await deps.db.select({ game: games, article: articles })
    .from(games).innerJoin(articles, eq(games.articleId, articles.id))
    .where(eq(games.id, gameId))
  if (!row) throw new Error('游戏不存在')
  const profile = KnowledgeProfileSchema.parse(row.game.profile)
  const spec = await compileGame(deps.llm, profile, row.article.content, difficulty)
  const created = deps.db.transaction((tx) => {
    return tx.insert(games).values({
      articleId: row.article.id, profile, spec, difficulty, createdAt: new Date(),
    }).returning().get()
  })
  return created.id
}
