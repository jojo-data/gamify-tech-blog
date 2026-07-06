import Link from 'next/link'
import { desc, eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { games, articles } from '@/db/schema'
import { UrlForm } from '@/components/UrlForm'
import { DailyChallenge } from '@/components/DailyChallenge'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const db = getDb()
  const recent = await db.select({ id: games.id, title: articles.title, createdAt: games.createdAt })
    .from(games).innerJoin(articles, eq(games.articleId, articles.id))
    .orderBy(desc(games.createdAt)).limit(20)
  return (
    <main className="mx-auto max-w-2xl p-8 flex flex-col gap-8">
      <h1 className="text-2xl font-bold">博客游戏化</h1>
      <UrlForm />
      <DailyChallenge />
      <section>
        <h2 className="mb-3 font-semibold text-gray-700 dark:text-gray-300">最近的游戏</h2>
        <ul className="flex flex-col gap-2">
          {recent.map(g => (
            <li key={g.id}>
              <Link href={`/play/${g.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{g.title}</Link>
            </li>
          ))}
          {recent.length === 0 && <li className="text-gray-400">还没有游戏，贴一个链接开始吧</li>}
        </ul>
      </section>
      <Link href="/notes" className="text-sm text-gray-500 dark:text-gray-400 hover:underline">→ 知识库</Link>
    </main>
  )
}
