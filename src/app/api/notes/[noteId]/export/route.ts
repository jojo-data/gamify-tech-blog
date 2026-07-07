import { getDb } from '@/db'
import { buildNoteExport, safeFileName, syncNoteToVault } from '@/lib/vault'

export async function GET(_req: Request, { params }: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await params
  const id = Number(noteId)
  const db = getDb()
  const built = Number.isInteger(id) ? await buildNoteExport(db, id) : null
  if (!built) return new Response('笔记不存在', { status: 404 })
  try {
    await syncNoteToVault(db, id)
  } catch (e) {
    console.error('写入 Obsidian vault 失败：', e)
  }
  const safeName = safeFileName(built.title)
  return new Response(built.md, {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}.md`,
    },
  })
}
