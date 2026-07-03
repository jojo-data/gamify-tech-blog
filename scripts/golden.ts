import { createDb } from '../src/db'
import { gatewayClient } from '../src/lib/llm'
import { fetchArticle } from '../src/lib/fetcher'
import { createGameFromUrl } from '../src/lib/pipeline'
import { games } from '../src/db/schema'
import { eq } from 'drizzle-orm'
import { GameSpecSchema } from '../src/lib/gamespec'

async function main() {
  const url = process.argv[2]
  if (!url) { console.error('用法：npm run golden -- <文章URL>'); process.exit(1) }
  const db = createDb()
  console.log('开始生成……（1-2 分钟）')
  const gameId = await createGameFromUrl({ db, llm: gatewayClient(), fetchArticle }, url)
  const [game] = await db.select().from(games).where(eq(games.id, gameId))
  const spec = GameSpecSchema.parse(game.spec)
  console.log(`\n标题：${spec.title}\n模式：${spec.mode}\n节点数：${spec.nodes.length}`)
  for (const n of spec.nodes) {
    const brief = n.type === 'question' ? `${n.text.slice(0, 40)}（${n.choices.length} 选项）` : n.type
    console.log(`  [${n.type}] ${n.id}: ${brief}`)
  }
  console.log(`\n游玩：http://localhost:3000/play/${gameId}`)
}
main()
