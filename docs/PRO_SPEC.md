# AlwaysCut 对标规格书：OpenChatCut Pro 全量功能

> 来源：对 `OpenChatCut Pro 3.1.0.app` 的逆向（rea-agents CLI + strings/otool/nm + 74 份 SKILL.md 全量提取）。
> 用途：作为 AlwaysCut 实现「Pro 全量功能」的唯一对标目标。本文是"要做什么"的完整清单，不写"怎么做"。
> 提取日期：2026-11-11。

---

## 1. 一句话结论

Pro 的本质是 **AI 导演工作台**：核心不是剪辑器，而是「**agent 身份 + 项目文档记忆 + 74 个垂直工作流 skill + 本地 AI 推理栈 + 多 LLM 生成集成**」。传统时间线剪辑只是它的"手"，自然语言是它的"输入"。

---

## 2. 技术栈对标

| 维度 | OpenChatCut Pro 3.1.0 | AlwaysCut（当前，实测代码） |
|---|---|---|
| 外壳 | Tauri 2 (Rust) + WebKit | Electron 43 + React 19 |
| Agent 框架 | PI（`@earendil-works/pi-*` 7 子包） | 自研 agent 层（`src/agent` 167 文件） |
| LLM | Claude + AWS Bedrock + Gemini + OpenAI + 本地 llama.cpp | Claude Code / Codex / Copilot（3 个） |
| 本地推理 | WeMM 2B / Qwen3-TTS / wav2vec2 / embedding-gemma / sherpa-onnx / CoreML | whisper 本地 ASR + 词级对齐 + MediaPipe 抠像 + ONNX 超分 |
| 渲染 | Remotion + mediabunny + compositor | Remotion 4 |
| 数据 | SQLite agent 会话 + 6 份项目文档 | 无 agent 持久化、无项目文档模型 |
| 账号 | sign-in + Ed25519 + keyring | 无 |
| Skill | 74 个（6 类） | 30 个 |
| 工具面 | ~40 个 | ~180 个 |

> ⚠️ 修正：早期逆向结论「开源版无 agent 层」是错的。AlwaysCut 开源版**已是完整 AI 剪辑 agent**（3 LLM + 30 skill + 180 工具 + 本地 ASR + 完整剪辑器）。真实差距是**具体能力增量**，不是「从零建 agent」。

---

## 3. 七大支柱（实现全量功能的完整范围）

**Pillar A — Agent 核心层（AI 导演）**
- 自然语言 → 工具调用循环（对话式剪辑）
- 6 文档项目记忆模型 + `read_project_doc`/`write_project_doc`（跨会话）
- SQLite 会话持久化（session/turn/event/credential）
- 多模型 + vision + thinking_level

**Pillar B — 工具面（编辑器能力暴露给 agent，~40 工具）**
- 时间线读写 / 转写词级对齐 / 渲染采样 / 音频分析 / 素材检索 / 导出 / 场景源

**Pillar C — 本地 AI 推理栈**
- ASR 转写（sherpa-onnx）/ 本地 TTS 配音（Qwen3-TTS 0.6b）/ 词级对齐（wav2vec2）/ 人声分离 / 多模态 embedding（WeMM 2B 素材检索）/ 超分降噪抠像

**Pillar D — Skill 体系（74 个垂直工作流）**
- skill 加载运行时 + 6 类工作流 + 13 个 MG 动效母版

**Pillar E — 生成集成（media-generation）**
- 生图 / 生视频 / 音乐 / 音效 / 云端转写 / 在线素材（多供应商）

**Pillar F — 账号与商业化**
- sign-in / 授权 / 密钥管理

**Pillar G — 剪辑器本体补强（已有但需补）**
- 词级时间轴、B-roll 轨道、画中画、对象/状态序列模型、`.cut` 场景源

---

## 4. 74 Skill 全量清单（6 类）

### 4.1 talking 口播/对话（12）
| skill | 职责 |
|---|---|
| talking-head-rough-cut | 用文字稿删语气词口癖、联动剪辑时间线 |
| talking-head-polish | 删改判据（删什么/多次重录留哪条） |
| talking-head-packaging | 口播包装：B-roll 铺满 + 说话人缩角落圆窗 |
| talking-head-subtitle | 规范字幕（一句一条+描边阴影+底部安全区） |
| caption-craft | 字幕断句/语言适配/跟发音钉时间 |
| presenter-led-explainer | 真人出镜讲解：结论给人脸、步骤给图表 |
| two-person-podcast | 双人播客成片（谁是谁/按说听切/分色字幕） |
| interview-two-cam | 双机位 A/B 切换与跳剪遮挡 |
| street-interview | 街访成片（一问一答节拍/最意外留最后） |
| course-chapter-cut | 长教程分章、删口误、章节标题 |
| knowledge-card-video | 口播配大字要点卡片 |
| silence-tighten | 检测删除长停顿静音 |

### 4.2 color 调色（6）
| skill | 职责 |
|---|---|
| cinematic-teal-orange | 青橙电影感（film-look+黑边+暗角+缓推） |
| film-grain-look | 胶片复古（film-look+颗粒+褪色） |
| moody-duotone | 双色调+压暗+光斑情绪片 |
| neon-night-city | 夜景霓虹光晕+高饱和赛博感 |
| clean-bright-tutorial | 修正发灰发暗→清晰明亮教程风 |
| skin-tone-fix | 定向修肤色（去黄/提亮面部）不动背景 |

### 4.3 motion 动效/MG（19）
| skill | 职责 |
|---|---|
| art-motion | 35 种艺术场景解说动画（Kurzgesagt/Vox/白板/3B1B/发布会/财经图表） |
| kinetic-type-intro | 大字动效片头（钩子→要点阵列→数字→落版） |
| logo-outro | 结尾 logo 落版（词标组装+辉光+CTA） |
| data-bar-race | 条形图竞赛 MG（名次标签+数字滚动+冠军定格） |
| data-drift | 深空黑紫青数据漂移科技标题 |
| deconstructed-glitch | 锈橙故障风揭幕 |
| folk-frequency | 玫红钴蓝民俗节庆欢快风 |
| maximalist-type | 红黄撞色最大化字体三幕快切 |
| shadow-cut | 黑色电影近单色血红点缀揭晓 |
| soft-signal-moment | 奶油底手写系人文金句卡 |
| swiss-grid-title | 瑞士网格高级感标题卡 |
| swiss-pulse-metrics | 黑底电蓝 12 列网格巨型数字滚动 |
| velvet-standard-deck | 黑底金线奢侈品品牌宣言 |
| title-motion-entrance | 标题色块衬底入场/出场（含逐字） |
| transition-selection-guide | 10 视觉转场+3 换字转场选型决策树 |
| punch-zoom-emphasis | 重点词台阶推近+短震强调 |
| ken-burns-motion | 照片缓慢推近横移 |
| photo-motion-pack | 多照片动态相册视频 |
| video-shotcraft | 电影感产品宣传片（157 镜头卡） |

### 4.4 social 短视频/社媒（9）
| skill | 职责 |
|---|---|
| horizontal-to-vertical | 横屏重构竖屏 9:16（模糊背景+安全区） |
| short-video-hook | 前 3 秒抓人（强镜头+悬念大字+快切音效） |
| beat-sync-cut | 按节拍重拍对齐切点（卡点） |
| highlight-reel-mix | 多素材高光混剪+BGM 对齐 |
| short-drama | 对白剧情剪成短剧（钩子+情绪节拍+分色字幕） |
| product-showcase | 产品特写+卖点字幕+质感调色带货 |
| ranking-listicle | 排行榜盘点视频（证据逐条揭晓） |
| end-card-cta | 片尾关注引导卡 |
| native-subtitle-quote-image | 字幕金句长图/访谈语录卡/社交拼图 |

### 4.5 audio 音频（5）
| skill | 职责 |
|---|---|
| audio-mix-voice-bgm | 人声基准+按段让位+层次混音 |
| audio-noise-cleanup | 底噪/爆音/风噪 AI 降噪 |
| sound-design-pack | 转场/强调/UI/氛围四层音效 |
| audio-fade-polish | 淡入淡出与结束点打磨 |
| voice-direction | 选音色+配音语气节奏指导 |

### 4.6 workflow 编排/总控（23）
| skill | 职责 |
|---|---|
| director | 总流程+路由表+6 文档+4 工作间（核心入口） |
| rough-to-final-workflow | 素材盘点到导出七阶段 |
| reference-breakdown | 拆解参考片并复刻 |
| reference-project-apply | 参照工程应用（照上次风格剪） |
| short-video-factory | 选题/文稿一条龙出片 |
| ecommerce-video-factory | 商品图→口播脚本→画面→配音→字幕→BGM |
| video-editing | 图片视频混剪科普/口播配图 |
| film-direction | 风格短片导演 |
| narration-led-demo | 旁白主导演示片 |
| media-generation | 生图/配音/视频/音乐/音效/转写/素材 |
| ai-enhance-guide | 抠像/超分/降噪/防抖/人声分离路由 |
| scene-script | 片子固化成 .cut 可复用文本 |
| workspace-video | HyperFrames 从零做整条视频 |
| asset-library-curator | 素材盘点/代理/按内容检索 |
| multi-scene-organization | 长项目分场景/轨道分层 |
| final-qc-delivery | 成片五项质检+规范导出 |
| critique-review | 五维打分+达标迭代 |
| b-roll-layering | 口播配 B-roll |
| image-direction | 生图提示词方法论 |
| video-direction | 生视频提示词方法论 |
| cinematic-shot-prompts | 空镜分镜四要素+Avoid 清单 |
| visual-continuity | 相邻镜头跳变修复 |
| aesthetic-standards | 全片美学准则+反 AI 味清单 |

---

## 5. 工具面（agent 可调用工具清单，~40 个）

**项目文档**：`read_project_doc` / `write_project_doc`
**时间线**：`transcribe_timeline` / `edit_transcript` / `insert_element` / `duplicate_scene` / `update_project_settings`
**渲染采样**：`render_frame_at` / `render_onion_skin` / `list_scene_cuts` / `build_evidence_grid`
**音频**：`measure_loudness` / `get_audio_levels` / `detect_silence` / `analyze_music` / `separate_vocals`
**素材**：`get_assets` / `get_library_assets` / `search_scenes` / `get_segment` / `view_frames` / `match_shots`
**AI 处理**：`process_media_ai`（抠像/超分/降噪/防抖）
**本地能力**：`list_local_models` / `check_perception_models` / `generate_local_speech`
**生成**：`list_media_providers` / `generate_media` / `get_media_job` / `import_generated_media` / `list_media_voices` / `apply_cloud_transcript`
**素材检索**：`search_stock_media` / `download_stock_media` / `search_sounds`
**工程**：`list_reference_scripts` / `read_reference_script` / `set_brand_profile` / `record_critique` / `read_skill` / `check_workspace` / `prepare_workspace`
**导出**：`export_project`

---

## 6. 数据模型（agent 持久化，SQLite）

```sql
agent_credentials(provider_id, type, credential, updated_at)
agent_sessions(id, project_id, mode, model, vision_model, thinking_level, created_at)
agent_turns(id, session_id, status, created_at, finished_at)
agent_events(id, turn_id, seq, type, payload, created_at)
agent_failure_reports(id, client_id, at, scope, message, context)
```

---

## 7. 本地推理栈

| 能力 | 实现 | 用途 |
|---|---|---|
| 多模态 embedding | WeMM 2B（transformers 5.16.1 + torch 2.14 + qwen-vl-utils） | 素材按内容检索 |
| 本地配音 | Qwen3-TTS 0.6b（qwen-tts 0.1.1） | 免费配音 |
| 词级对齐 | wav2vec2（align_server.py） | 词级时间戳 |
| 文本 embedding | embedding-gemma | 语义匹配 |
| ASR/人声分离 | sherpa-onnx | 转写/分离 |
| 加速 | CoreML / Apple Neural Engine | 本地推理加速 |

---

## 8. 六文档模型（项目记忆的核心）

| 文档 | 管什么 | 类别 |
|---|---|---|
| brief | 用户说过并能作数的事（目标/受众/硬约束/花费） | 目标真相 |
| treatment | 创作答案（钩子→payoff、人物表演、镜头场景） | 目标真相 |
| progress | 当下快照（现在的问题/下一步/阻碍/进行中任务） | 目标真相 |
| analysis | 参考片为何成立（留人点/论证/命门） | 参考真相 |
| timeline | 参考片按时间的对象清单 | 参考真相 |
| objects | 对象→素材映射 + 状态序列 | 参考真相 |

核心规矩：**重写不是追加**（同名覆盖）、**参考真相与目标真相分开**、**progress 是交接单不是历史**、**证据与解读分开写**。

---

## 9. 生成集成（media providers）

| kind | 能力 | 代表供应商 |
|---|---|---|
| image | 文生图/图生图 | MiniMax / WaveSpeed / 智谱 CogView |
| video | 文生视频/图生视频/超分 | Gemini Veo3.1 / MiniMax-H3 / 可灵 / 百炼万相 / Vidu / bfl |
| speech | 配音 | ElevenLabs / 智谱 / HeyGen / MiMo / OpenAI / 百炼 |
| music | 音乐 | Gemini Lyria / ElevenLabs |
| sound | 音效 | ElevenLabs |
| transcription | 转写 | 豆包 / 百炼 qwen-audio |
| stock | 在线素材 | 多图库 + 博物馆开放藏品 |
| svg | 矢量图 | quiver |

---

## 10. 账号体系

sign-in + `/auth/login` 路由 + Ed25519 签名 + `@napi-rs/keyring` 存密钥。媒体账户独立于对话模型账户。
