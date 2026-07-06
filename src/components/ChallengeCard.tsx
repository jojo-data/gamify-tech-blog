'use client'
import { useState } from 'react'

export type CardData = {
  id: number
  question: string
  choices: { id: string; text: string }[]
  correctChoiceId: string
  explanation: string
}

export function ChallengeCard({ card, onDone }: { card: CardData; onDone?: (correct: boolean) => void }) {
  const [chosen, setChosen] = useState<string | null>(null)
  const [syncFailed, setSyncFailed] = useState(false)

  async function choose(choiceId: string) {
    if (chosen) return
    setChosen(choiceId)
    const correct = choiceId === card.correctChoiceId
    onDone?.(correct)
    try {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ choiceId }),
      })
      if (!res.ok) setSyncFailed(true)
    } catch {
      setSyncFailed(true)
    }
  }

  return (
    <div className="rounded-lg border dark:border-gray-700 p-4 flex flex-col gap-3">
      <p className="font-medium">🃏 {card.question}</p>
      <ul className="flex flex-col gap-2">
        {card.choices.map(c => (
          <li key={c.id}>
            <button onClick={() => choose(c.id)} disabled={chosen !== null}
              className={`w-full rounded-lg border p-2 text-left text-sm ${
                chosen && c.id === card.correctChoiceId ? 'border-green-500 bg-green-50 dark:bg-green-950'
                : chosen === c.id ? 'border-red-500 bg-red-50 dark:bg-red-950' : 'hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
              }`}>{c.text}</button>
          </li>
        ))}
      </ul>
      {chosen && <p className="text-sm text-gray-600 dark:text-gray-400">💡 {card.explanation}</p>}
      {syncFailed && <p className="text-xs text-amber-600">⚠ 复习进度同步失败，本次作答未记录</p>}
    </div>
  )
}
