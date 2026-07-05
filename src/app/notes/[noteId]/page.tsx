import { notFound } from 'next/navigation'
import Link from 'next/link'
import { and, eq, lte } from 'drizzle-orm'
import { getDb } from '@/db'
import { notes, games, articles, cards } from '@/db/schema'
import { KnowledgeProfileSchema } from '@/lib/profile'
import { GameSpecSchema } from '@/lib/gamespec'
import type { Answer } from '@/lib/engine'
import { ChallengeGate } from '@/components/ChallengeGate'

export const dynamic = 'force-dynamic'

export default async function NotePage({ params }: { params: Promise<{ noteId: string }> }) {
  const { noteId } = await params
  const db = getDb()
  const [row] = await db.select({ note: notes, game: games, article: articles })
    .from(notes)
    .innerJoin(games, eq(notes.gameId, games.id))
    .innerJoin(articles, eq(games.articleId, articles.id))
    .where(eq(notes.id, Number(noteId)))
  if (!row) notFound()
  const profile = KnowledgeProfileSchema.parse(row.game.profile)
  const spec = GameSpecSchema.parse(row.game.spec)
  const answers = row.note.answers as Answer[]
  const storedMistakes = row.note.mistakes as { question: string; reveal: string }[]
  const mistakes = storedMistakes.length > 0 ? storedMistakes : answers
    .filter(a => a.scored && !a.correct)
    .map(a => { const node = spec.nodes.find(n => n.id === a.nodeId); return node?.type === 'question' ? { question: node.text, reveal: node.reveal } : null })
    .filter((m): m is { question: string; reveal: string } => m !== null)
  const [dueCard] = await db.select().from(cards)
    .where(and(eq(cards.noteId, row.note.id), lte(cards.dueAt, new Date()))).limit(1)

  const body = (
    <article className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{row.article.title}</h1>
        <a href={row.article.url} target="_blank" rel="noreferrer noopener" className="text-sm text-blue-600 hover:underline">原文 ↗</a>
      </div>
      <section>
        <h2 className="mb-2 font-semibold">核心要点</h2>
        <ul className="list-disc pl-5 flex flex-col gap-1">
          {(row.note.takeaways as string[]).map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      </section>
      {profile.concepts.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">概念图谱</h2>
          <ul className="flex flex-col gap-2">
            {profile.concepts.map(c => (
              <li key={c.name} className="rounded-lg border p-3 text-sm">
                <span className="font-medium">{c.name}</span>：{c.definition}
                {c.dependsOn.length > 0 && <span className="text-gray-400">（依赖：{c.dependsOn.join('、')}）</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {mistakes.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">当时做错的题</h2>
          <ul className="flex flex-col gap-2">
            {mistakes.map((m, i) => (
              <li key={i} className="rounded-lg bg-red-50 p-3 text-sm">
                <p className="font-medium">{m.question}</p>
                <p className="mt-1 text-gray-600">💡 {m.reveal}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {(row.note.gaps as { query: string; explanation: string }[]).length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">Knowledge gaps（当时求助过）</h2>
          <ul className="flex flex-col gap-2">
            {(row.note.gaps as { query: string; explanation: string }[]).map((g, i) => (
              <li key={i} className="rounded-lg bg-amber-50 p-3 text-sm">
                <p className="font-medium">{g.query}</p>
                <p className="mt-1 text-gray-600">{g.explanation}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      <a href={`/api/notes/${row.note.id}/export`} className="w-fit rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">
        导出 Obsidian Markdown
      </a>
      <Link href="/notes" className="text-sm text-gray-500 hover:underline">← 知识库</Link>
    </article>
  )

  return (
    <main className="mx-auto max-w-2xl p-8">
      {dueCard ? (
        <ChallengeGate card={{
          id: dueCard.id, question: dueCard.question,
          choices: dueCard.choices as { id: string; text: string }[],
          correctChoiceId: dueCard.correctChoiceId, explanation: dueCard.explanation,
        }}>{body}</ChallengeGate>
      ) : body}
    </main>
  )
}
