# 技术博客游戏化学习系统

贴入技术博客链接 → 生成可玩游戏（决策冒险/侦探解谜/预测闯关/快问快答）→ 通关归档为知识笔记 + 挑战卡 → 间隔重复复习，可导出 Obsidian。

## 快速开始
1. `cp .env.example .env`，填入 `AI_GATEWAY_API_KEY`（[Vercel AI Gateway](https://vercel.com/docs/ai-gateway) 控制台创建）
2. `npm install && npm run dev`
3. 打开 http://localhost:3000 贴入文章链接

## 切换模型
LLM 调用经 AI Gateway 路由，改 `.env` 里的 `LLM_MODEL` 即可切换任意模型（`provider/model` 格式，版本号用点）：
`anthropic/claude-sonnet-5`、`openai/gpt-5.4`、`google/gemini-3-flash` 等 100+ 模型。`LLM_LITE_MODEL` 负责求助/翻译等轻量任务。

## 常用命令
- `npm test` — 单元测试
- `npm run seed` — 插入种子游戏（无需 API key 即可体验）
- `npm run golden -- <url>` — 真实 LLM 金样本回归（人工评估）

## 适配读者
- 游戏内容语言跟随原文（英文博客→英文游戏）；知识库归档统一英文，非英文术语保留原文对照
- 生成时可选难度（初学者/熟悉领域），游戏页可换难度重开（复用分析结果，只重新编译）
- 游戏内双轨求助：点术语 chips 看白话解释；右下角「这里没看懂？」打开求助对话（多轮追问、跨节点持续、刷新不丢，轻量模型实时回答）
- 求助记录归档为 Knowledge gaps + 术语挑战卡，与错题卡一起进入间隔重复

## Obsidian 同步
在 `.env` 设置 `OBSIDIAN_VAULT_PATH`（可指向 vault 内子文件夹，不存在会自动创建）后：
- **通关归档时自动写入** vault 一份笔记（失败不影响归档，仅记日志）
- 笔记详情页「导出」按钮同样会写入 vault + 下载
- 同名文件保护：属于同一笔记的文件覆盖更新（以 frontmatter `note-id` 识别）；他人同名文件不动，改存 `<标题>-n<id>.md`

## 设计文档
见 `docs/superpowers/specs/2026-07-03-gamify-tech-blog-design.md`
