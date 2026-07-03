import type { KnowledgeProfile } from './profile'
import type { GameSpec } from './gamespec'
import type { Answer } from './engine'

const CATEGORY_TAGS: Record<KnowledgeProfile['category'], string> = {
  architecture: '系统架构', concept: '原理', postmortem: '故障复盘', tooling: '工具',
}

export function noteToMarkdown(input: {
  noteId: number; title: string; url: string; siteName: string | null; createdAt: Date
  profile: KnowledgeProfile; spec: GameSpec; answers: Answer[]
}): string {
  const { noteId, title, url, siteName, createdAt, profile, spec, answers } = input
  const lines: string[] = [
    '---',
    `source: ${JSON.stringify(url)}`,
    `site: ${JSON.stringify(siteName ?? '')}`,
    `date: ${createdAt.toISOString().slice(0, 10)}`,
    `note-id: ${noteId}`,
    `tags: [技术博客游戏化, ${CATEGORY_TAGS[profile.category]}]`,
    '---',
    '',
    `# ${title}`,
    '',
    `> ${profile.summary}`,
    '',
    '## 核心要点',
    ...profile.takeaways.map(t => `- ${t}`),
  ]
  if (profile.concepts.length > 0) {
    lines.push('', '## 概念')
    for (const c of profile.concepts) {
      const deps = c.dependsOn.length > 0 ? `（依赖 ${c.dependsOn.map(d => `[[${d}]]`).join('、')}）` : ''
      lines.push(`- [[${c.name}]]：${c.definition}${deps}`)
    }
  }
  const mistakes = answers.filter(a => a.scored && !a.correct)
  if (mistakes.length > 0) {
    lines.push('', '## 当时做错的题')
    for (const m of mistakes) {
      const node = spec.nodes.find(n => n.id === m.nodeId)
      if (node?.type === 'question') lines.push(`- **${node.text}** — ${node.reveal}`)
    }
  }
  lines.push('', `[原文](${url})`, '')
  return lines.join('\n')
}
