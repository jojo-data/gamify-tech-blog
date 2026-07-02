import { completeJson, type LlmClient } from './llm'
import { GameSpecSchema, type GameSpec, type Mode } from './gamespec'
import type { KnowledgeProfile } from './profile'

export const MODE_BY_CATEGORY: Record<KnowledgeProfile['category'], Mode> = {
  architecture: 'decision',
  postmortem: 'detective',
  concept: 'prediction',
  tooling: 'quiz',
}

const MODE_GUIDES: Record<Mode, string> = {
  decision: `玩法：决策冒险。玩家扮演文中团队的工程师。用 scene 节点交代背景，在文章的每个关键技术决策处放一个 question 节点：scored 设为 false，choices 覆盖当时的候选方案，每个 choice 的 feedback 描述选它的现实后果，reveal 揭示作者团队的真实选择与理由。6-10 个节点，choices 可用 next 做轻度分支，但所有路径最终汇入同一个 end。`,
  detective: `玩法：侦探解谜。开场 scene 描述故障症状（不剧透根因）。一个 clueHub 节点：budget 5-8，clues 4-6 条取材自文中的日志、图表、时间线（cost 1-3，越关键越贵）。随后 1-2 个 question（scored true）让玩家提出根因假设，reveal 给出真实复盘结论。end 总结教训。`,
  prediction: `玩法：预测闯关。把原理推导切成 4-6 个台阶。每个台阶：scene 铺垫已知条件 → question（scored true）让玩家预测「接下来会发生什么/结果是什么」，reveal 解释原文答案。由浅入深。`,
  quiz: `玩法：快问快答。恰好 5 个 question 节点（scored true），每题是取材于文章的场景判断题，无剧情节点，startNodeId 指向第一题，最后接 end。`,
}

const SPEC_SHAPE = `{"version":1,"mode":"<模式>","title":"...","intro":"开场白","startNodeId":"...","nodes":[
 {"id":"...","type":"scene","text":"...","next":"..."},
 {"id":"...","type":"question","text":"...","scored":true,"choices":[{"id":"a","text":"...","correct":true,"feedback":"...","next":"可选"}],"reveal":"...","next":"..."},
 {"id":"...","type":"clueHub","text":"...","budget":6,"clues":[{"id":"c1","label":"...","cost":2,"content":"..."}],"next":"..."},
 {"id":"...","type":"end","summary":"..."}]}`

function buildPrompt(mode: Mode, profile: KnowledgeProfile, articleContent: string): string {
  return `你是一名教育游戏设计师。根据下面的知识档案和文章正文，产出一份中文游戏谱 JSON。

${MODE_GUIDES[mode]}

硬性规则：
- mode 必须是 "${mode}"
- 所有节点 id 唯一；所有 next / choice.next 必须指向存在的节点；必须有 end 节点
- scored 为 true 的 question 必须恰有一个 choice 的 correct 为 true
- 内容必须忠于原文，不得编造文章没有的事实
- 只输出 JSON，结构示例：${SPEC_SHAPE}

知识档案：${JSON.stringify(profile)}
文章正文（节选）：
${articleContent.slice(0, 40000)}`
}

export async function compileGame(
  client: LlmClient, profile: KnowledgeProfile, articleContent: string,
): Promise<GameSpec> {
  const mode = MODE_BY_CATEGORY[profile.category]
  try {
    return await completeJson(client, buildPrompt(mode, profile, articleContent), GameSpecSchema)
  } catch (e) {
    if (mode === 'quiz') throw e
    return completeJson(client, buildPrompt('quiz', profile, articleContent), GameSpecSchema)
  }
}
