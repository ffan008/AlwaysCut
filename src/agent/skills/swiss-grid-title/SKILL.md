---
name: swiss-grid-title
description: "瑞士网格标题卡母版（网格线+几何形+大标题精确落格）：要做一屏高级感标题卡/章节页/引言页（编辑部、极简、设计感）时用；模板名「瑞士网格标题卡」，改 props 即得成品"
---

# 瑞士网格标题卡（Swiss Grid Title）

## 触发场景
- 「高级感标题卡」「章节页」「引言页」
- 编辑部、极简、设计感、网格对齐的风格

## 何时不用
- 强节奏大字开场 → 用「大字动效片头」
- 数据指标 → 用「瑞士数据脉冲」
- 黑金仪式感 → 用「天鹅绒宣言」

## 使用流程
1. `add_motion_graphic({ templateName: "瑞士网格标题卡" })` 放置母版
2. `update_item_props({ itemId, props: { kicker, headline, footnote, bg, ink, accent, line, muted } })` 改文案与配色
3. 渲染抽「网格划出 / 标题落格」两帧核对

## 可改 props
- `kicker` 顶部小标 · `headline` 大标题 · `footnote` 脚注
- `bg` 背景 · `ink` 主字 · `accent` 强调色 · `line` 网格线 · `muted` 弱字

## 验收
- 网格线横竖划出、大标题精确落格、几何形对齐
- 留白充足、无文字越界
