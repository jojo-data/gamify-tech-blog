'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const STAGES = ['正在抓取文章…', '正在分析知识结构…', '正在编译游戏…（约 1-2 分钟）']

export function UrlForm() {
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [difficulty, setDifficulty] = useState<'beginner' | 'expert'>('beginner')
  const router = useRouter()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(null); setStage(0)
    const timer = setInterval(() => setStage(s => Math.min(s + 1, STAGES.length - 1)), 15000)
    try {
      const res = await fetch('/api/games', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url, difficulty }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '生成失败')
      router.push(`/play/${data.gameId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败')
      setBusy(false)
    } finally {
      clearInterval(timer)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          value={url} onChange={e => setUrl(e.target.value)} required type="url"
          placeholder="粘贴技术博客链接，把它变成一局游戏"
          className="flex-1 rounded-lg border dark:border-gray-700 dark:bg-gray-900 px-4 py-3"
        />
        <button disabled={busy} className="rounded-lg bg-black dark:bg-white px-6 py-3 text-white dark:text-black disabled:opacity-50">
          {busy ? '生成中…' : '开玩'}
        </button>
      </div>
      <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
        <label className="flex items-center gap-1">
          <input type="radio" checked={difficulty === 'beginner'} onChange={() => setDifficulty('beginner')} />
          初学者（白话铺垫）
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" checked={difficulty === 'expert'} onChange={() => setDifficulty('expert')} />
          熟悉领域（原文节奏）
        </label>
      </div>
      {busy && <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">{STAGES[stage]}</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  )
}
