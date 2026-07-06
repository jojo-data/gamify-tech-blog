'use client'
import { useReducer, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { GameSpec } from '@/lib/gamespec'
import { startGame, reduce, currentNode, score, type EngineState, type EngineAction } from '@/lib/engine'
import { HelpPanel } from '@/components/HelpPanel'

const MODE_LABELS: Record<GameSpec['mode'], string> = {
  decision: '决策冒险', detective: '侦探解谜', prediction: '预测闯关', quiz: '快问快答',
}

export function GameRuntime({ spec, gameId }: { spec: GameSpec; gameId: number }) {
  const [state, dispatch] = useReducer(
    (s: EngineState, a: EngineAction) => reduce(s, a), spec, startGame,
  )
  const [started, setStarted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [noteId, setNoteId] = useState<number | null>(null)
  const router = useRouter()
  const node = currentNode(state)

  async function archive() {
    setSaving(true)
    try {
      const res = await fetch('/api/plays', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ gameId, answers: state.answers }),
      })
      if (res.ok) {
        const { noteId } = await res.json()
        setNoteId(noteId)
        router.push(`/notes/${noteId}`)
      }
    } finally { setSaving(false) }
  }

  if (!started) {
    return (
      <div className="flex flex-col gap-4">
        <span className="w-fit rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1 text-xs">{MODE_LABELS[spec.mode]}</span>
        <h1 className="text-2xl font-bold">{spec.title}</h1>
        <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{spec.intro}</p>
        <button onClick={() => setStarted(true)} className="w-fit rounded-lg bg-black dark:bg-white px-6 py-3 text-white dark:text-black">开始</button>
      </div>
    )
  }

  if (node.type === 'scene') {
    return (
      <div className="flex flex-col gap-4">
        <p className="whitespace-pre-wrap leading-relaxed">{node.text}</p>
        <button onClick={() => dispatch({ type: 'advance' })} className="w-fit rounded-lg bg-black dark:bg-white px-6 py-2 text-white dark:text-black">继续</button>
        <HelpPanel key={node.id} gameId={gameId} nodeId={node.id} nodeText={node.text} glossary={spec.glossary} />
      </div>
    )
  }

  if (node.type === 'clueHub') {
    return (
      <div className="flex flex-col gap-4">
        <p className="whitespace-pre-wrap">{node.text}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">线索预算：{state.budgetLeft} 点（像 on-call 一样，先查最值得查的）</p>
        <ul className="flex flex-col gap-2">
          {node.clues.map(clue => {
            const opened = state.openedClues.includes(clue.id)
            return (
              <li key={clue.id} className="rounded-lg border dark:border-gray-700 p-3">
                {opened ? (
                  <><span className="font-medium">{clue.label}</span>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{clue.content}</p></>
                ) : (
                  <button
                    onClick={() => dispatch({ type: 'openClue', clueId: clue.id })}
                    disabled={clue.cost > state.budgetLeft}
                    className="flex w-full justify-between disabled:opacity-40"
                  >
                    <span>🔍 {clue.label}</span><span className="text-sm text-gray-500 dark:text-gray-400">花费 {clue.cost}</span>
                  </button>
                )}
              </li>
            )
          })}
        </ul>
        <button onClick={() => dispatch({ type: 'advance' })} className="w-fit rounded-lg bg-black dark:bg-white px-6 py-2 text-white dark:text-black">我心里有数了，提出假设 →</button>
        <HelpPanel key={node.id} gameId={gameId} nodeId={node.id} nodeText={node.text} glossary={spec.glossary} />
      </div>
    )
  }

  if (node.type === 'question') {
    const answered = state.answers.find(a => a.nodeId === node.id)
    const chosen = node.choices.find(c => c.id === answered?.choiceId)
    return (
      <div className="flex flex-col gap-4">
        <p className="whitespace-pre-wrap font-medium">{node.text}</p>
        <ul className="flex flex-col gap-2">
          {node.choices.map(c => (
            <li key={c.id}>
              <button
                onClick={() => dispatch({ type: 'choose', choiceId: c.id })}
                disabled={state.revealed}
                className={`w-full rounded-lg border p-3 text-left ${
                  state.revealed && c.id === chosen?.id
                    ? (!node.scored ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : c.correct ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-red-500 bg-red-50 dark:bg-red-950')
                    : state.revealed && node.scored && c.correct ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                }`}
              >{c.text}</button>
            </li>
          ))}
        </ul>
        <HelpPanel key={node.id} gameId={gameId} nodeId={node.id} nodeText={node.text} glossary={spec.glossary} />
        {state.revealed && chosen && (
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4 text-sm flex flex-col gap-2">
            <p>{chosen.feedback}</p>
            <p className="text-gray-600 dark:text-gray-400">💡 {node.reveal}</p>
            <button onClick={() => dispatch({ type: 'advance' })} className="w-fit rounded-lg bg-black dark:bg-white px-4 py-2 text-white dark:text-black">继续</button>
          </div>
        )}
      </div>
    )
  }

  const s = score(state)
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-bold">通关 🎉</h2>
      {s.total > 0 && <p>得分：{s.correct} / {s.total}</p>}
      <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{node.summary}</p>
      {noteId === null && (
        <button onClick={archive} disabled={saving} className="w-fit rounded-lg bg-black dark:bg-white px-6 py-3 text-white dark:text-black disabled:opacity-50">
          {saving ? '归档中…' : '归档到知识库'}
        </button>
      )}
    </div>
  )
}
