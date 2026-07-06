'use client'
import { useEffect, useRef, useState } from 'react'

type Msg = { role: 'user' | 'assistant'; content: string }

export function ChatDrawer({ gameId, nodeId }: { gameId: number; nodeId: string }) {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const nodeIdRef = useRef(nodeId)
  nodeIdRef.current = nodeId

  useEffect(() => {
    if (!open || loaded) return
    setLoaded(true)
    fetch(`/api/hints?gameId=${gameId}`)
      .then(r => (r.ok ? r.json() : { hints: [] }))
      .then((d: { hints: { query: string; explanation: string }[] }) => {
        setMessages(d.hints.flatMap(h => [
          { role: 'user' as const, content: h.query },
          { role: 'assistant' as const, content: h.explanation },
        ]))
      })
      .catch(() => {})
  }, [open, loaded, gameId])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages, busy])

  async function send() {
    const question = input.trim()
    if (!question || busy) return
    setBusy(true); setError(false)
    const history = messages.slice(-12)
    setMessages(m => [...m, { role: 'user', content: question }])
    try {
      const res = await fetch('/api/hints', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: 'question', gameId, nodeId: nodeIdRef.current, query: question, history }),
      })
      if (!res.ok) throw new Error()
      const { explanation } = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: explanation }])
      setInput('')
    } catch {
      setError(true)
      setMessages(m => m.slice(0, -1))
    } finally { setBusy(false) }
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 rounded-full border dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm shadow-lg hover:bg-gray-50 dark:hover:bg-gray-800">
        💬 这里没看懂？
      </button>
      {open && (
        <div className="fixed inset-y-0 right-0 z-50 flex w-[400px] flex-col border-l dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl max-md:inset-x-0 max-md:top-auto max-md:bottom-0 max-md:h-[75vh] max-md:w-full max-md:border-l-0 max-md:border-t">
          <div className="flex items-center justify-between border-b dark:border-gray-700 p-3">
            <span className="text-sm font-medium">求助对话</span>
            <button onClick={() => setOpen(false)} className="rounded px-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">✕</button>
          </div>
          <div ref={listRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-3 text-sm">
            {messages.length === 0 && !busy && (
              <p className="text-gray-400 dark:text-gray-500">对这局游戏里任何看不懂的地方提问，可以连续追问。</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user'
                ? 'self-end max-w-[85%] rounded-lg bg-black dark:bg-white px-3 py-2 text-white dark:text-black'
                : 'self-start max-w-[85%] whitespace-pre-wrap rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2 text-gray-800 dark:text-gray-200'}>
                {m.content}
              </div>
            ))}
            {busy && <p className="self-start animate-pulse text-gray-400 dark:text-gray-500">思考中…</p>}
            {error && <p className="text-xs text-red-500">求助失败，请重试</p>}
          </div>
          <form onSubmit={e => { e.preventDefault(); send() }} className="flex gap-2 border-t dark:border-gray-700 p-3">
            <textarea value={input} onChange={e => setInput(e.target.value)} rows={2}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="哪里没看懂？用任何语言问都行（Enter 发送）"
              className="flex-1 rounded-lg border dark:border-gray-700 dark:bg-gray-950 p-2 text-sm" />
            <button disabled={busy || !input.trim()} className="self-end rounded-lg bg-black dark:bg-white px-3 py-2 text-sm text-white dark:text-black disabled:opacity-50">发送</button>
          </form>
        </div>
      )}
    </>
  )
}
