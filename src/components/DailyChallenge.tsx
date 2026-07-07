import { lte } from 'drizzle-orm'
import { getDb } from '@/db'
import { cards } from '@/db/schema'
import { ChallengeCard } from './ChallengeCard'

export async function DailyChallenge() {
  const db = getDb()
  const due = await db.select().from(cards).where(lte(cards.dueAt, new Date())).limit(3)
  if (due.length === 0) return null
  return (
    <section>
      <h2 className="mb-3 font-semibold text-gray-700 dark:text-gray-300">今日挑战（{due.length}）</h2>
      <div className="flex flex-col gap-3">
        {due.map(c => (
          <ChallengeCard key={c.id} card={{
            id: c.id, question: c.question,
            choices: c.choices as { id: string; text: string }[],
            correctChoiceId: c.correctChoiceId, explanation: c.explanation,
          }} />
        ))}
      </div>
    </section>
  )
}
