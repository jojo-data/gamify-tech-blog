import { expect, test } from 'vitest'
import { GameSpecSchema } from './gamespec'

const base = {
  version: 1, mode: 'quiz', title: 'T', intro: 'I', startNodeId: 'q1',
  nodes: [
    { id: 'q1', type: 'question', text: '问题？', reveal: '解析', next: 'end',
      choices: [
        { id: 'a', text: 'A', correct: true, feedback: '对' },
        { id: 'b', text: 'B', feedback: '错' },
      ] },
    { id: 'end', type: 'end', summary: '总结' },
  ],
}

test('合法谱通过校验，choice.correct 默认 false', () => {
  const spec = GameSpecSchema.parse(base)
  const q = spec.nodes[0]
  if (q.type !== 'question') throw new Error()
  expect(q.choices[1].correct).toBe(false)
  expect(q.scored).toBe(true)
})

test('引用不存在的节点被拒绝', () => {
  const bad = structuredClone(base)
  ;(bad.nodes[0] as { next: string }).next = 'ghost'
  expect(GameSpecSchema.safeParse(bad).success).toBe(false)
})

test('节点 id 重复被拒绝', () => {
  const bad = structuredClone(base)
  bad.nodes.push({ id: 'q1', type: 'end', summary: 'dup' })
  expect(GameSpecSchema.safeParse(bad).success).toBe(false)
})

test('缺少 end 节点被拒绝', () => {
  const bad = structuredClone(base)
  bad.nodes = [bad.nodes[0]]
  ;(bad.nodes[0] as { next: string }).next = 'q1'
  expect(GameSpecSchema.safeParse(bad).success).toBe(false)
})
