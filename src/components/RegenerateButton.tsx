'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function RegenerateButton({ gameId, current }: { gameId: number; current: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const router = useRouter()
  const target = current === 'beginner' ? 'expert' : 'beginner'

  async function regen() {
    setBusy(true); setError(false)
    try {
      const res = await fetch('/api/games/regenerate', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ gameId, difficulty: target }),
      })
      if (!res.ok) throw new Error()
      const { gameId: newId } = await res.json()
      router.push(`/play/${newId}`)
    } catch { setError(true); setBusy(false) }
  }

  return (
    <div className="mb-4 flex items-center gap-2 text-xs text-gray-400">
      <button onClick={regen} disabled={busy} className="underline disabled:opacity-50">
        {busy ? '重新生成中…（约 1 分钟）' : current === 'beginner' ? '觉得太简单？换「熟悉领域」难度重开' : '觉得太难？换「初学者」难度重开'}
      </button>
      {error && <span className="text-red-400">失败，请重试</span>}
    </div>
  )
}
