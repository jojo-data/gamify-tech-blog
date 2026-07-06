'use client'
import { useState } from 'react'
import type { GlossaryEntry } from '@/lib/gamespec'

export function HelpPanel({ gameId, nodeId, nodeText, glossary }: {
  gameId: number; nodeId: string; nodeText: string; glossary: GlossaryEntry[]
}) {
  const relevant = glossary.filter(g => nodeText.toLowerCase().includes(g.term.toLowerCase()))
  const [opened, setOpened] = useState<string | null>(null)
  const [asking, setAsking] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  function openTerm(g: GlossaryEntry) {
    setOpened(opened === g.term ? null : g.term)
    if (opened !== g.term) {
      fetch('/api/hints', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: 'glossary', gameId, nodeId, query: g.term, explanation: g.explanation }),
      }).catch(() => {})
    }
  }

  async function ask(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(false); setAnswer(null)
    try {
      const res = await fetch('/api/hints', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: 'question', gameId, nodeId, query: question }),
      })
      if (!res.ok) throw new Error()
      setAnswer((await res.json()).explanation)
    } catch {
      setError(true)
    } finally { setBusy(false) }
  }

  return (
    <div className="mt-2 flex flex-col gap-2 text-sm">
      {relevant.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {relevant.map(g => (
            <button key={g.term} onClick={() => openTerm(g)}
              className={`rounded-full border dark:border-gray-700 px-3 py-1 text-xs ${opened === g.term ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
              📖 {g.term}
            </button>
          ))}
        </div>
      )}
      {opened && (
        <p className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3 text-gray-700 dark:text-gray-300">
          {glossary.find(g => g.term === opened)?.explanation}
        </p>
      )}
      {!asking ? (
        <button onClick={() => setAsking(true)} className="w-fit text-xs text-gray-400 dark:text-gray-500 underline">这里没看懂？问一下</button>
      ) : (
        <form onSubmit={ask} className="flex flex-col gap-2">
          <textarea value={question} onChange={e => setQuestion(e.target.value)} required
            placeholder="哪里没看懂？用任何语言问都行" className="rounded-lg border dark:border-gray-700 dark:bg-gray-900 p-2" rows={2} />
          <button disabled={busy || !question.trim()} className="w-fit rounded-lg border dark:border-gray-700 px-3 py-1 text-xs disabled:opacity-50">
            {busy ? '思考中…' : '提问'}
          </button>
          {answer && <p className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 text-gray-700 dark:text-gray-300">💡 {answer}</p>}
          {error && <p className="text-xs text-red-500">求助失败，请重试</p>}
        </form>
      )}
    </div>
  )
}
