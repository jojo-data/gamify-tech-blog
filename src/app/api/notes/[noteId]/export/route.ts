import { eq } from 'drizzle-orm'
import fs from 'node:fs'
import path from 'node:path'
import { getDb } from '@/db'
import { notes, games, articles } from '@/db/schema'
import { KnowledgeProfileSchema } from '@/lib/profile'
import { GameSpecSchema } from '@/lib/gamespec'
import type { Answer } from '@/lib/engine'
import { noteToMarkdown } from '@/lib/markdown'

export async function GET(_req: Request, { params }: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await params
  const db = getDb()
  const [row] = await db.select({ note: notes, game: games, article: articles })
    .from(notes)
    .innerJoin(games, eq(notes.gameId, games.id))
    .innerJoin(articles, eq(games.articleId, articles.id))
    .where(eq(notes.id, Number(noteId)))
  if (!row) return new Response('笔记不存在', { status: 404 })
  const md = noteToMarkdown({
    title: row.article.title, url: row.article.url, siteName: row.article.siteName,
    createdAt: row.note.createdAt,
    profile: KnowledgeProfileSchema.parse(row.game.profile),
    spec: GameSpecSchema.parse(row.game.spec),
    answers: row.note.answers as Answer[],
  })
  const safeName = row.article.title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80)
  const vault = process.env.OBSIDIAN_VAULT_PATH
  if (vault) await fs.promises.writeFile(path.join(vault, `${safeName}.md`), md, 'utf8')
  return new Response(md, {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}.md`,
    },
  })
}
