import type { GameSpec, GameNode, ClueHubNode } from './gamespec'

export type Answer = { nodeId: string; choiceId: string; correct: boolean; scored: boolean }

export type EngineState = {
  spec: GameSpec
  currentId: string
  revealed: boolean
  answers: Answer[]
  openedClues: string[]
  budgetLeft: number
  finished: boolean
}

export type EngineAction =
  | { type: 'choose'; choiceId: string }
  | { type: 'advance' }
  | { type: 'openClue'; clueId: string }

function byId(spec: GameSpec, id: string): GameNode {
  const node = spec.nodes.find(n => n.id === id)
  if (!node) throw new Error(`节点不存在：${id}`)
  return node
}

export function startGame(spec: GameSpec): EngineState {
  const hub = spec.nodes.find(n => n.type === 'clueHub') as ClueHubNode | undefined
  return {
    spec, currentId: spec.startNodeId, revealed: false,
    answers: [], openedClues: [],
    budgetLeft: hub?.budget ?? 0,
    finished: byId(spec, spec.startNodeId).type === 'end',
  }
}

export function currentNode(state: EngineState): GameNode {
  return byId(state.spec, state.currentId)
}

export function score(state: EngineState): { correct: number; total: number } {
  const scored = state.answers.filter(a => a.scored)
  return { correct: scored.filter(a => a.correct).length, total: scored.length }
}

export function reduce(state: EngineState, action: EngineAction): EngineState {
  const node = currentNode(state)
  switch (action.type) {
    case 'choose': {
      if (node.type !== 'question' || state.revealed) return state
      const choice = node.choices.find(c => c.id === action.choiceId)
      if (!choice) return state
      const answer = { nodeId: node.id, choiceId: choice.id, correct: choice.correct, scored: node.scored }
      return { ...state, revealed: true, answers: [...state.answers, answer] }
    }
    case 'openClue': {
      if (node.type !== 'clueHub') return state
      const clue = node.clues.find(c => c.id === action.clueId)
      if (!clue || state.openedClues.includes(clue.id) || clue.cost > state.budgetLeft) return state
      return { ...state, openedClues: [...state.openedClues, clue.id], budgetLeft: state.budgetLeft - clue.cost }
    }
    case 'advance': {
      let nextId: string
      if (node.type === 'question') {
        if (!state.revealed) return state
        const answer = state.answers.findLast(a => a.nodeId === node.id)
        const choice = node.choices.find(c => c.id === answer?.choiceId)
        nextId = choice?.next ?? node.next
      } else if (node.type === 'scene' || node.type === 'clueHub') {
        nextId = node.next
      } else {
        return state
      }
      return { ...state, currentId: nextId, revealed: false, finished: byId(state.spec, nextId).type === 'end' }
    }
  }
}
