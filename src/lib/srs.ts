const INTERVALS_DAYS = [1, 3, 7, 14, 30]
const DAY = 86400000

export function nextReview(streak: number, correct: boolean, now: Date): { streak: number; dueAt: Date } {
  if (!correct) return { streak: 0, dueAt: new Date(now.getTime() + 10 * 60000) }
  const next = streak + 1
  const days = INTERVALS_DAYS[Math.min(next - 1, INTERVALS_DAYS.length - 1)]
  return { streak: next, dueAt: new Date(now.getTime() + days * DAY) }
}
