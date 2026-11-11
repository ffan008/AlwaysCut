---
name: title-motion-entrance
description: "片头/章节标题的色块衬底与入场/出场动画（文字优先套动画预设，含逐字效果）：用户说「加片头标题/标题动画/标题一个字一个字出来」时用；模板名「标题动态入场」，改 props 即得成品"
---

# 标题动态入场（Title Motion Entrance）

## 触发场景
- 「加片头标题」「标题动画」「标题一个字一个字出来」
- 章节标题的色块衬底 + 入场/出场动画

## 何时不用
- 四幕完整片头 → 用「大字动效片头」
- 片尾 logo → 用「Logo 落版尾板」
- 高级感章节页 → 用「瑞士网格标题卡」

## 使用流程
1. `add_motion_graphic({ templateName: "标题动态入场" })` 放置母版
2. `update_item_props({ itemId, props: { title, subtitle, bg, blockColor, titleColor, subtitleColor } })` 改标题与配色
3. 渲染抽「色块落下 / 逐字入场 / 淡出」三帧核对

## 可改 props
- `title` 主标题（逐字入场）· `subtitle` 副标题
- `bg` 背景 · `blockColor` 色块衬底 · `titleColor` 标题色 · `subtitleColor` 副标题色

## 设计规约
- 色块衬底下沉入场 → 主标题逐字淡入 → 副标题整体上浮 → 停留后统一淡出
- 文字优先套动画预设

## 验收
- 色块衬底与标题节奏协调
- 逐字入场不跳、淡出干净
