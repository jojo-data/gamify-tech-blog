import { z } from 'zod'

export const ChoiceSchema = z.object({
  id: z.string(),
  text: z.string(),
  correct: z.boolean().default(false),
  feedback: z.string(),
  next: z.string().optional(),
})

export const SceneNodeSchema = z.object({
  id: z.string(), type: z.literal('scene'), text: z.string(), next: z.string(),
})

export const QuestionNodeSchema = z.object({
  id: z.string(), type: z.literal('question'), text: z.string(),
  choices: z.array(ChoiceSchema).min(2),
  scored: z.boolean().default(true),
  reveal: z.string(),
  next: z.string(),
})

export const ClueSchema = z.object({
  id: z.string(), label: z.string(), cost: z.number().int().positive(), content: z.string(),
})

export const ClueHubNodeSchema = z.object({
  id: z.string(), type: z.literal('clueHub'), text: z.string(),
  budget: z.number().int().positive(),
  clues: z.array(ClueSchema).min(3),
  next: z.string(),
})

export const EndNodeSchema = z.object({
  id: z.string(), type: z.literal('end'), summary: z.string(),
})

export const GameNodeSchema = z.discriminatedUnion('type', [
  SceneNodeSchema, QuestionNodeSchema, ClueHubNodeSchema, EndNodeSchema,
])

export const GameSpecSchema = z.object({
  version: z.literal(1),
  mode: z.enum(['decision', 'detective', 'prediction', 'quiz']),
  title: z.string(),
  intro: z.string(),
  startNodeId: z.string(),
  nodes: z.array(GameNodeSchema).min(2),
}).superRefine((spec, ctx) => {
  const ids = new Set<string>()
  for (const n of spec.nodes) {
    if (ids.has(n.id)) ctx.addIssue({ code: 'custom', message: `节点 id 重复：${n.id}` })
    ids.add(n.id)
  }
  const targets = [spec.startNodeId]
  for (const n of spec.nodes) {
    if (n.type !== 'end') targets.push(n.next)
    if (n.type === 'question') for (const c of n.choices) if (c.next) targets.push(c.next)
  }
  for (const t of targets) if (!ids.has(t)) {
    ctx.addIssue({ code: 'custom', message: `引用了不存在的节点：${t}` })
  }
  if (!spec.nodes.some(n => n.type === 'end')) {
    ctx.addIssue({ code: 'custom', message: '缺少 end 节点' })
  }
})

export type Choice = z.infer<typeof ChoiceSchema>
export type QuestionNode = z.infer<typeof QuestionNodeSchema>
export type ClueHubNode = z.infer<typeof ClueHubNodeSchema>
export type GameNode = z.infer<typeof GameNodeSchema>
export type GameSpec = z.infer<typeof GameSpecSchema>
export type Mode = GameSpec['mode']
