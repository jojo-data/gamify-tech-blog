import { expect, test } from 'vitest'
import { GameSpecSchema, type GameSpec } from './gamespec'
import { startGame, reduce, currentNode, score } from './engine'

const spec: GameSpec = GameSpecSchema.parse({
  version: 1, mode: 'detective', title: 'T', intro: 'I', startNodeId: 'scene1',
  nodes: [
    { id: 'scene1', type: 'scene', text: '故障了', next: 'hub' },
    { id: 'hub', type: 'clueHub', text: '查线索', budget: 3,
      clues: [
        { id: 'c1', label: '日志', cost: 2, content: '日志内容' },
        { id: 'c2', label: '图表', cost: 2, content: '图表内容' },
        { id: 'c3', label: '时间线', cost: 1, content: '时间线内容' },
      ], next: 'q1' },
    { id: 'q1', type: 'question', text: '根因是？', reveal: '是连接池耗尽', next: 'end',
      choices: [
        { id: 'a', text: '连接池', correct: true, feedback: '对' },
        { id: 'b', text: '网络', feedback: '错' },
      ] },
    { id: 'end', type: 'end', summary: '完' },
  ],
})

test('走完全程：scene→clueHub→question→end', () => {
  let s = startGame(spec)
  expect(currentNode(s).type).toBe('scene')
  s = reduce(s, { type: 'advance' })
  expect(currentNode(s).type).toBe('clueHub')
  s = reduce(s, { type: 'openClue', clueId: 'c1' })
  expect(s.budgetLeft).toBe(1)
  s = reduce(s, { type: 'openClue', clueId: 'c2' })   // 预算不够，忽略
  expect(s.budgetLeft).toBe(1)
  expect(s.openedClues).toEqual(['c1'])
  s = reduce(s, { type: 'advance' })
  s = reduce(s, { type: 'choose', choiceId: 'a' })
  expect(s.revealed).toBe(true)
  s = reduce(s, { type: 'advance' })
  expect(s.finished).toBe(true)
  expect(score(s)).toEqual({ correct: 1, total: 1 })
})

test('question 未作答不能 advance；重复 choose 忽略', () => {
  let s = startGame(spec)
  s = reduce(s, { type: 'advance' })
  s = reduce(s, { type: 'advance' })   // 到 q1
  const before = s
  s = reduce(s, { type: 'advance' })   // 未作答，应原地不动
  expect(s).toBe(before)
  s = reduce(s, { type: 'choose', choiceId: 'b' })
  s = reduce(s, { type: 'choose', choiceId: 'a' })   // 已作答，忽略
  expect(s.answers).toHaveLength(1)
  expect(s.answers[0].correct).toBe(false)
})

test('choice.next 优先于 node.next', () => {
  const branching = GameSpecSchema.parse({
    version: 1, mode: 'decision', title: 'T', intro: 'I', startNodeId: 'q1',
    nodes: [
      { id: 'q1', type: 'question', text: '选？', scored: false, reveal: 'r', next: 'endA',
        choices: [
          { id: 'a', text: 'A', feedback: 'f' },
          { id: 'b', text: 'B', feedback: 'f', next: 'endB' },
        ] },
      { id: 'endA', type: 'end', summary: 'A 结局' },
      { id: 'endB', type: 'end', summary: 'B 结局' },
    ],
  })
  let s = startGame(branching)
  s = reduce(s, { type: 'choose', choiceId: 'b' })
  s = reduce(s, { type: 'advance' })
  expect(s.currentId).toBe('endB')
  expect(score(s)).toEqual({ correct: 0, total: 0 })  // scored:false 不计分
})
