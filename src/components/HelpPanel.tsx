'use client'
import { useState } from 'react'
import type { GlossaryEntry } from '@/lib/gamespec'

export function HelpPanel({ gameId, nodeId, nodeText, glossary }: {
  gameId: number; nodeId: string; nodeText: string; glossary: GlossaryEntry[]
}) {
  const relevant = glossary.filter(g => nodeText.toLowerCase().includes(g.term.toLowerCase()))
  const [opened, setOpened] = useState<string | null>(null)

  function openTerm(g: GlossaryEntry) {
    setOpened(opened === g.term ? null : g.term)
    if (opened !== g.term) {
      fetch('/api/hints', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: 'glossary', gameId, nodeId, query: g.term, explanation: g.explanation }),
      }).catch(() => {})
    }
  }

  if (relevant.length === 0) return null

  return (
    <div className="mt-2 flex flex-col gap-2 text-sm">
      <div className="flex flex-wrap gap-2">
        {relevant.map(g => (
          <button key={g.term} onClick={() => openTerm(g)}
            className={`rounded-full border dark:border-gray-700 px-3 py-1 text-xs ${opened === g.term ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
            📖 {g.term}
          </button>
        ))}
      </div>
      {opened && (
        <p className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3 text-gray-700 dark:text-gray-300">
          {glossary.find(g => g.term === opened)?.explanation}
        </p>
      )}
    </div>
  )
}
