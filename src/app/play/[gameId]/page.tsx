import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { games } from '@/db/schema'
import { GameSpecSchema } from '@/lib/gamespec'
import { GameRuntime } from '@/components/GameRuntime'

export default async function PlayPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params
  const db = getDb()
  const [game] = await db.select().from(games).where(eq(games.id, Number(gameId)))
  if (!game) notFound()
  const spec = GameSpecSchema.parse(game.spec)
  return (
    <main className="mx-auto max-w-2xl p-8">
      <GameRuntime spec={spec} gameId={game.id} />
    </main>
  )
}
