import fs from 'node:fs'
import path from 'node:path'
import { eq } from 'drizzle-orm'
import type { Db } from '@/db'
import { notes, games, articles } from '@/db/schema'
import { KnowledgeProfileSchema } from './profile'
import { GameSpecSchema } from './gamespec'
import type { Answer } from './engine'
import { noteToMarkdown } from './markdown'

export function safeFileName(title: string): string {
  return title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80)
}

export async function buildNoteExport(db: Db, noteId: number): Promise<{ md: string; title: string } | null> {
  const [row] = await db.select({ note: notes, game: games, article: articles })
    .from(notes)
    .innerJoin(games, eq(notes.gameId, games.id))
    .innerJoin(articles, eq(games.articleId, articles.id))
    .where(eq(notes.id, noteId))
  if (!row) return null
  const md = noteToMarkdown({
    noteId,
    title: row.article.title, url: row.article.url, siteName: row.article.siteName,
    createdAt: row.note.createdAt,
    profile: KnowledgeProfileSchema.parse(row.game.profile),
    spec: GameSpecSchema.parse(row.game.spec),
    answers: row.note.answers as Answer[],
  })
  return { md, title: row.article.title }
}

// 覆盖规则：frontmatter 的 note-id 标记属于本笔记的文件可覆盖（重复导出幂等）；
// 同名但不属于本笔记的文件不动，改用带 noteId 的确定性文件名。
export async function writeNoteToVault(vault: string, title: string, noteId: number, md: string): Promise<string> {
  await fs.promises.mkdir(vault, { recursive: true })
  const base = safeFileName(title)
  const primary = path.join(vault, `${base}.md`)
  const marker = `note-id: ${noteId}`
  let target = primary
  try {
    const existing = await fs.promises.readFile(primary, 'utf8')
    if (!existing.includes(marker)) target = path.join(vault, `${base}-n${noteId}.md`)
  } catch {
    // primary 不存在，直接使用
  }
  await fs.promises.writeFile(target, md, 'utf8')
  return target
}

export async function syncNoteToVault(db: Db, noteId: number): Promise<string | null> {
  const vault = process.env.OBSIDIAN_VAULT_PATH
  if (!vault) return null
  const built = await buildNoteExport(db, noteId)
  if (!built) return null
  return writeNoteToVault(vault, built.title, noteId, built.md)
}
