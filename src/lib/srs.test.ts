import { expect, test } from 'vitest'
import { nextReview } from './srs'

const now = new Date('2026-07-03T00:00:00Z')
const day = 86400000

test('答对沿间隔序列 1,3,7,14,30 上升并封顶', () => {
  expect(nextReview(0, true, now)).toEqual({ streak: 1, dueAt: new Date(+now + 1 * day) })
  expect(nextReview(1, true, now)).toEqual({ streak: 2, dueAt: new Date(+now + 3 * day) })
  expect(nextReview(4, true, now)).toEqual({ streak: 5, dueAt: new Date(+now + 30 * day) })
  expect(nextReview(9, true, now)).toEqual({ streak: 10, dueAt: new Date(+now + 30 * day) })
})

test('答错归零，10 分钟后重新到期', () => {
  expect(nextReview(3, false, now)).toEqual({ streak: 0, dueAt: new Date(+now + 10 * 60000) })
})
