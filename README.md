# 技术博客游戏化学习系统

贴入技术博客链接 → 生成可玩游戏（决策冒险/侦探解谜/预测闯关/快问快答）→ 通关归档为知识笔记 + 挑战卡 → 间隔重复复习，可导出 Obsidian。

## 快速开始
1. `cp .env.example .env`，填入 `AI_GATEWAY_API_KEY`（[Vercel AI Gateway](https://vercel.com/docs/ai-gateway) 控制台创建）
2. `npm install && npm run dev`
3. 打开 http://localhost:3000 贴入文章链接

## 切换模型
LLM 调用经 AI Gateway 路由，改 `.env` 里的 `LLM_MODEL` 即可切换任意模型（`provider/model` 格式，版本号用点）：
`anthropic/claude-sonnet-4.6`、`openai/gpt-5.4`、`google/gemini-3-flash` 等 100+ 模型。

## 常用命令
- `npm test` — 单元测试
- `npm run seed` — 插入种子游戏（无需 API key 即可体验）
- `npm run golden -- <url>` — 真实 LLM 金样本回归（人工评估）

## 设计文档
见 `docs/superpowers/specs/2026-07-03-gamify-tech-blog-design.md`
