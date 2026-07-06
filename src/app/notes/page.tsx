import Link from 'next/link'
import { desc, eq, like } from 'drizzle-orm'
import { getDb } from '@/db'
import { notes, games, articles } from '@/db/schema'

export const dynamic = 'force-dynamic'

export default async function NotesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const db = getDb()
  const base = db.select({ id: notes.id, title: articles.title, createdAt: notes.createdAt })
    .from(notes)
    .innerJoin(games, eq(notes.gameId, games.id))
    .innerJoin(articles, eq(games.articleId, articles.id))
  const rows = await (q ? base.where(like(articles.title, `%${q}%`)) : base)
    .orderBy(desc(notes.createdAt)).limit(50)
  return (
    <main className="mx-auto max-w-2xl p-8 flex flex-col gap-6">
      <h1 className="text-2xl font-bold">知识库</h1>
      <form className="flex gap-2">
        <input name="q" defaultValue={q ?? ''} placeholder="搜索笔记标题"
          className="flex-1 rounded-lg border dark:border-gray-700 dark:bg-gray-900 px-4 py-2" />
        <button className="rounded-lg bg-black dark:bg-white px-4 py-2 text-white dark:text-black">搜索</button>
      </form>
      <ul className="flex flex-col gap-2">
        {rows.map(n => (
          <li key={n.id} className="rounded-lg border dark:border-gray-700 p-3">
            <Link href={`/notes/${n.id}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">{n.title}</Link>
            <p className="text-xs text-gray-400">{n.createdAt.toLocaleDateString('zh-CN')}</p>
          </li>
        ))}
        {rows.length === 0 && <li className="text-gray-400">没有找到笔记</li>}
      </ul>
      <Link href="/" className="text-sm text-gray-500 dark:text-gray-400 hover:underline">← 首页</Link>
    </main>
  )
}
