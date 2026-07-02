import { z } from 'zod'

export const KnowledgeProfileSchema = z.object({
  category: z.enum(['architecture', 'concept', 'postmortem', 'tooling']),
  summary: z.string(),
  concepts: z.array(z.object({
    name: z.string(),
    definition: z.string(),
    dependsOn: z.array(z.string()).default([]),
  })),
  decisions: z.array(z.object({
    situation: z.string(),
    options: z.array(z.string()),
    chosen: z.string(),
    rationale: z.string(),
  })).default([]),
  misconceptions: z.array(z.object({ wrong: z.string(), right: z.string() })).default([]),
  takeaways: z.array(z.string()).min(3).max(5),
})

export type KnowledgeProfile = z.infer<typeof KnowledgeProfileSchema>
