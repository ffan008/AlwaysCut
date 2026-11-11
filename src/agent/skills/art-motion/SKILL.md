---
name: art-motion
description: "艺术场景解说动画：把抽象概念、原理、数据做成逐帧艺术动画，覆盖 Kurzgesagt 扁平、Vox 3D 拼贴、白板手绘、3Blue1Brown 数学动画、发布会 keynote、财经图表等风格，用于「把这个概念做成动画讲解」。"
---

# 艺术场景解说动画（Art Motion）

## 适用场景

把抽象概念、科学原理、商业逻辑、数据变化做成「图形会动」的解说动画——不是字幕叠在实拍上，而是整段用图形、图标、箭头、图表驱动叙事。典型风格覆盖 35 种艺术场景（扁平 / 3D 拼贴 / 白板手绘 / 数学动画 / 发布会 / 财经图表 / 信息图等）。

## 风格选型（按表达目标）

| 表达目标 | 推荐风格 | 落地方式 |
|---|---|---|
| 原理/机制拆解 | Kurzgesagt 扁平、白板手绘 | `create_motion_graphic_from_code` 手写 JSX 动画 |
| 数据/趋势 | 财经图表、信息图、3Blue1Brown 数学动画 | `add_motion_graphic` 套数据模板 |
| 观点/叙事 | Vox 3D 拼贴、发布会 keynote | `create_motion_graphic` 搭场景 |
| 情绪/概念 | 抽象几何、粒子、渐变流 | `create_motion_graphic_from_code` 写 shader/动效 |

先用 `read_project_doc` 确认 brief/treatment，把「要讲清的那一句话」先定下来，再决定用哪类视觉，不要先画后想。

## 工作流

1. **拆解概念**：把要讲的内容拆成「对象 + 关系 + 随时间的变化」，一个对象对应一段可复用的动画（入场 → 持续 → 变化 → 退出）。
2. **选风格定方向**：按上表选视觉风格，确定主色、形状语言、动效节奏，写进 `treatment`。
3. **分镜成卡**：把整段拆成若干镜头卡（每个镜头讲一个点），用 `add_motion_graphic` 或 `create_motion_graphic_from_code` 逐卡实现，优先复用库内模板（`list_templates` / `manage_template`）。
4. **排时间线**：用 `add_motion_graphic` 按叙事顺序排进时间线，配合 `view_timeline_frames` 抽帧核对动效与文案对位。
5. **配字配声**：字幕用 `edit_captions` 规范（一句一条、底部安全区），配音按需 `submit_voice`，背景乐用 `submit_music`。

## 注意事项

- 动画是「讲清」的手段，不是装饰：每段动效都要对应一个表达目的，删掉不承载信息的纯装饰动效。
- 一镜一个重点，别把多个信息堆进同一帧。
- 动效参数改 `update_item_props` 即可，不要重写整段 JSX。
- 导出前 `verify_export` 抽帧核对动效无遮挡、无卡顿。

## 交付前自检

- [ ] 概念已拆成「对象 + 关系 + 变化」，风格已写进 treatment
- [ ] 每段动效都对应一个表达点，无纯装饰
- [ ] 字幕/配音/配乐与动效对位
- [ ] `verify_export` 抽帧确认动效流畅无遮挡
