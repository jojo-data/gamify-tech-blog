# 求助对话升级（Phase 1.5.1）— 设计文档

日期：2026-07-06
状态：已确认（用户批准）
前置：Phase 1.5（feature/phase1.5-adaptive，PR #1）；本设计在同分支迭代

## 0. 背景

真实游玩反馈：①自由提问是单发的——上一轮问答不进上下文、追问时旧回答被清空；②内联问答区撑长游戏页面、挤压下方内容；③用户询问上下文注入机制（现状：文章前 2 万字符 + 当前节点文本 + 问题，单发无历史）。

## 1. 多轮上下文（hints 服务）

- `answerQuestionHint(db, lite, gameId, nodeId, question, history?)`：新增 `history: {role: 'user'|'assistant', content: string}[]` 参数（调用方传最近若干轮）。
- prompt 结构：指令 → 文章片段 → **对话历史段（若非空）** → 当前节点文本 → 玩家问题。
- 服务端裁剪：history 最多取最近 **200 条消息**（安全网，非功能限制——2026-07-07 按用户决策放开轮数），每条 content 超 2000 字符截断。
- 文章上下文窗口从 20000 提升到 **200000 字符**（防御性上限；隐式前缀缓存使多轮重复成本按缓存价计）。
- 每个提问仍独立落一条 hint（kind='question'，query=问题、explanation=回答）——归档 / Knowledge gaps / 术语卡机制零改动。

## 2. API

- `POST /api/hints`（question 分支）：body 增加可选 `history` 数组，zod 校验（role enum、content string max 2000、数组 max 200）。glossary 分支不变。
- 新增 `GET /api/hints?gameId=<id>`：返回该局全部 question 类 hints（按 createdAt 升序，`{nodeId, query, explanation, createdAt}[]`），用于刷新后恢复对话。gameId 非法返回 400 中文。

## 3. UI — ChatDrawer

- 新组件 `src/components/ChatDrawer.tsx`（client）：
  - 悬浮按钮「这里没看懂？」固定在视口右下（`fixed bottom-6 right-6`），仅游戏进行中显示（intro/end 不显示）。
  - 点击滑出右侧抽屉：desktop `w-[400px]` 全高侧栏；`max-md:` 全宽底部 75vh sheet。含标题栏（关闭按钮）、可滚动消息列表、底部输入框+发送。
  - **会话范围：整局一条对话线，跨节点持续**（用户决策）。组件挂在 GameRuntime 顶层，不随节点重建；发送时携带当前 nodeId（由 GameRuntime 以 prop 传入最新值）。
  - 发送时把组件内消息列表的最近 12 条作为 history 一并 POST。
  - **刷新恢复**：抽屉首次打开时 GET /api/hints?gameId= 拉历史填充消息列表。
  - busy 态（思考中…）、失败提示「求助失败，请重试」（消息保留在输入框可重发）。
  - 深色模式：新组件自带 dark: 变体。
- `HelpPanel` 瘦身：只保留术语 chips（内联原位），提问区移除；HelpPanel 的 glossary 记录逻辑不变。
- GameRuntime：挂 ChatDrawer（顶层一次），HelpPanel 仍按节点渲染 chips。

## 4. 非目标（YAGNI）

- 流式输出（回答 ≤150 词，2-3 秒等待可接受）
- 对话导出 / 多会话管理 / 消息删除
- glossary chips 位置与机制改动

## 5. 错误处理

- GET 端点 gameId 非数字/不存在 → 400/空数组（不存在返回空数组即可，不报错）。
- history 校验失败 → 整体 400 参数不合法（与现有一致）。
- 恢复历史失败 → 抽屉显示空对话，可正常继续提问（fire-and-forget 容错）。

## 6. 测试

- hints 服务：history 拼入 prompt（顺序、12 条截断、2000 字符截断）、40000 窗口——fake LLM 单测。
- GET 端点：入参校验逻辑（如抽为纯函数则单测，否则手测）。
- ChatDrawer 薄渲染不单测；手测脚本沿用种子游戏。
