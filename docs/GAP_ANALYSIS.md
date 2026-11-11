# AlwaysCut vs OpenChatCut Pro 差距分析 + 路线图

> 基于 `docs/PRO_SPEC.md`（Pro 全量规格）与 AlwaysCut 实际代码逐项比对。
> 关键修正：AlwaysCut 开源版**已是完整 AI 剪辑 agent**，不是"传统剪辑器"。
> 结论：真实差距是**具体能力增量**，路径是「增量补齐」，不是「架构重写」。

---

## 0. 基线（AlwaysCut 已具备，无需重建）

| 能力 | 现状 |
|---|---|
| Agent 层 | `src/agent` 167 文件：Claude Code / Codex / Copilot 3 个 LLM provider + serverRun + external-bridge + context 管理/压缩 + vision |
| Skill 体系 | 30 个内置 skill（SKILL.md）+ skill-creator + skills-catalog |
| 工具面 | ~180 个 agent 工具（timeline/edit-item/transcript/captions/effect/shader/scene-detection/multicam/reframe/audio/beat/silence/loudness/isolate-voice/generate/stock/music/design/template/export/publish/web/search…） |
| 本地推理 | whisper 本地 ASR + 词级对齐 + MediaPipe 抠像 + ONNX 超分/降噪 |
| 剪辑器 | transcript / multicam / tracking / scene-detection / reframe(竖屏) / color / audio / captions / generate / export |

---

## 1. 差距全景（七大缺口，按价值排序）

### 缺口 1 — 项目记忆模型（Pro 灵魂，最大差距）🔴
Pro 用 6 文档（brief/treatment/progress/analysis/timeline/objects）+ `read_project_doc`/`write_project_doc` + SQLite 会话持久化，实现「跨会话的导演记忆」。**AlwaysCut 完全没有**。这是从「工具 agent」到「会记事的导演」的关键一跃，且不依赖外部模型/花钱。

### 缺口 2 — 垂直 skill 广度（~44 个缺失）🟠
Pro 74 vs AlwaysCut 30，去重后约 44 个缺失，集中在：
- **color 6 个全部缺失**（青橙/胶片/双色调/霓虹/教程亮/肤色）
- **motion 13 个 MG 母版缺失**（kinetic-type-intro/logo-outro/data-bar-race/swiss-grid-title/velvet/…）
- **audio 4 个缺失**（混音/降噪/音效/淡入淡出）
- **talking 7 个缺失**（双人播客/双机位/街访/网课/知识卡片/口播包装）
- **social 4 个缺失**（前3秒钩子/短剧/榜单/片尾CTA）
- **workflow 10 个缺失**（director/reference-breakdown/参考工程应用/旁白demo/.cut场景源/多场景组织/critique评审/视觉连续性/美学准则/ai-enhance路由）

### 缺口 3 — 本地 TTS 配音 🟠
Pro 有 Qwen3-TTS 0.6b 本地免费配音（`generate_local_speech`）。**AlwaysCut 只有云端 TTS**（voice skill 走供应商）。

### 缺口 4 — 多模态素材检索 🟠
Pro 有 WeMM 2B 多模态 embedding，支持「按内容找镜头」。AlwaysCut 的 media-search 是元数据/文本检索，无视觉语义。

### 缺口 5 — 多 LLM 扩展 🟡
Pro 有 Bedrock/Gemini/OpenAI + 本地 llama.cpp。AlwaysCut 只有 Claude Code/Codex/Copilot。

### 缺口 6 — director 编排层 🟠
Pro 的 `director` skill（6 文档 + 4 工作间 + 路由表）是整个体系的「总控」，AlwaysCut 缺失（需与缺口 1 一起做）。

### 缺口 7 — 账号/商业化 ⚪（可选）
Pro 有 sign-in + 授权。这是商业化能力，非核心剪辑功能，可按需后置。

---

## 2. 分阶段路线图

| 阶段 | 交付 | 价值 | 依赖 |
|---|---|---|---|
| **P1 项目记忆** | 6 文档模型 + read/write_project_doc 工具 + SQLite 会话持久化 + director skill（4 工作间+路由表） | 灵魂，跨会话记忆，Pro 最大差异化 | 无外部依赖 |
| **P2 高频 skill 补齐** | color 6 + audio 5 + talking 补齐 + social 补齐（第一批） | 垂直能力广度，复用已有 180 工具编排 | P1（skill 挂在记忆之上） |
| **P3 本地推理** | 本地 TTS（Qwen3-TTS）+ 多模态检索（WeMM 2B） | 免费配音 + 语义找镜头 | 需下载模型（>50MB） |
| **P4 生成集成** | Bedrock/Gemini/OpenAI providers + media-generation 供应商矩阵 | 多模型、多供应商生成 | 用户密钥 |
| **P5 MG 母版库** | 13 个 Remotion MG 母版模板（kinetic-type-intro/data-bar-race/logo-outro…） | 一键大片感开场/落版/数据可视化 | P2 |
| **P6 账号**（可选） | sign-in + 授权 | 商业化 | 后置 |

---

## 3. 关键架构决策（需对齐）

1. **外壳**：维持 Electron，**不迁 Tauri**。AlwaysCut 已是完整 agent，迁移纯属浪费，收益极低、风险极高。
2. **记忆模型**：自研 6 文档（轻量 JSON/SQLite 落盘），**不引入 PI 框架**（`@earendil-works/pi-*`）。PI 是 Pro 的私有栈，与 AlwaysCut 自研 agent 层重复；6 文档模型是"数据模型 + 读写工具"，几行即可落地。
3. **本地模型**：先做「本地 TTS + 多模态检索」两个高价值项；本地 llama.cpp 大模型后置（价值低、体积大、与现有 3 云端 provider 重叠）。
