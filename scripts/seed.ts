import { createDb } from '../src/db'
import { articles, games } from '../src/db/schema'
import { GameSpecSchema } from '../src/lib/gamespec'

const spec = GameSpecSchema.parse({
  version: 1, mode: 'detective', title: '数据库连接风暴之谜', intro: '凌晨 3 点，你被告警吵醒：API 全线超时。',
  startNodeId: 's1',
  nodes: [
    { id: 's1', type: 'scene', text: 'p99 延迟从 200ms 飙到 30s，数据库 CPU 却只有 40%。', next: 'hub' },
    { id: 'hub', type: 'clueHub', text: '你有限的精力只够查几件事。', budget: 5,
      clues: [
        { id: 'c1', label: '应用日志', cost: 2, content: '大量 "waiting for connection from pool" 报错。' },
        { id: 'c2', label: '数据库慢查询', cost: 2, content: '一条未走索引的报表查询，平均 25s。' },
        { id: 'c3', label: '最近的发布记录', cost: 1, content: '昨晚上线了新的报表功能。' },
        { id: 'c4', label: '网络监控', cost: 2, content: '网络一切正常。' },
      ], next: 'q1' },
    { id: 'q1', type: 'question', text: '根因最可能是？', reveal: '慢查询长时间占用连接，把连接池抽干，其它请求全部排队。', next: 'q2',
      choices: [
        { id: 'a', text: '慢查询耗尽了连接池', correct: true, feedback: '正是。连接池是共享资源，一个慢查询能拖垮所有人。' },
        { id: 'b', text: '数据库 CPU 不足', feedback: 'CPU 只有 40%，不是瓶颈。' },
        { id: 'c', text: '网络抖动', feedback: '网络监控显示一切正常。' },
      ] },
    { id: 'q2', type: 'question', text: '最优先的止血动作是？', reveal: '先杀慢查询/下线报表功能恢复服务，事后再补索引。', next: 'end',
      choices: [
        { id: 'a', text: '回滚昨晚的报表功能', correct: true, feedback: '对，先止血再病。' },
        { id: 'b', text: '给报表查询加索引再发布', feedback: '方向对但太慢，线上还在流血。' },
      ] },
    { id: 'end', type: 'end', summary: '教训：慢查询的杀伤力不在自身，而在它占用的共享资源。' },
  ],
})

async function main() {
  const db = createDb()
  const [a] = await db.insert(articles).values({
    url: 'seed://demo', title: '数据库连接风暴之谜（种子）', siteName: null,
    content: '种子文章', fetchedAt: new Date(),
  }).returning()
  const [g] = await db.insert(games).values({
    articleId: a.id,
    profile: { category: 'postmortem', summary: '种子', concepts: [{ name: '连接池', definition: '数据库连接的共享池', dependsOn: [] }], decisions: [], misconceptions: [], takeaways: ['慢查询会拖垮连接池', '先止血再治病', '共享资源需要隔离'] },
    spec, createdAt: new Date(),
  }).returning()
  console.log(`种子游戏已创建：http://localhost:3000/play/${g.id}`)
}
main()
