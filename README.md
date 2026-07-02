# 技术博客游戏化学习系统

贴入技术博客链接 → 生成可玩游戏（决策冒险/侦探解谜/预测闯关/快问快答）→ 通关归档为知识笔记 + 挑战卡 → 间隔重复复习，可导出 Obsidian。

## 快速开始
1. `cp .env.example .env`，填入 `ANTHROPIC_API_KEY`
2. `npm install && npm run dev`
3. 打开 http://localhost:3000 贴入文章链接

## 常用命令
- `npm test` — 单元测试
- `npm run seed` — 插入种子游戏（无需 API key 即可体验）
- `npm run golden -- <url>` — 真实 LLM 金样本回归（人工评估）

## 设计文档
见 `docs/superpowers/specs/2026-07-03-gamify-tech-blog-design.md`
