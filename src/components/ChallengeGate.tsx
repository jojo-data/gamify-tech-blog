'use client'
import { useState } from 'react'
import { ChallengeCard, type CardData } from './ChallengeCard'

export function ChallengeGate({ card, children }: { card: CardData; children: React.ReactNode }) {
  const [passed, setPassed] = useState(false)
  const [answered, setAnswered] = useState(false)
  if (passed) return <>{children}</>
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500">在看笔记之前，先试试还记不记得——</p>
      <ChallengeCard card={card} onDone={() => setAnswered(true)} />
      <button onClick={() => setPassed(true)} className="w-fit text-sm text-gray-500 underline">
        {answered ? '继续看笔记 →' : '跳过，直接看笔记'}
      </button>
    </div>
  )
}
