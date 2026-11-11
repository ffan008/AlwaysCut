---
name: soft-signal-moment
description: "柔光人文母版（奶油底、手写系衬线、手绘圈重点、缓慢漂移）：健康品牌/生活方式/个人叙事/播客金句这类温暖亲密的一屏金句卡用；模板名「柔光时刻」，改 props 即得成品"
---

# 柔光时刻（Soft Signal Moment）

## 触发场景
- 健康品牌、生活方式、个人叙事、播客金句
- 温暖亲密的一屏金句卡

## 何时不用
- 悬疑/黑暗 → 用「黑色剪辑」
- 高能量 → 用「最大化字体」
- 临床数据 → 用「瑞士数据脉冲」

## 使用流程
1. `add_motion_graphic({ templateName: "柔光时刻" })` 放置母版
2. `update_item_props({ itemId, props: { quote, highlight, attribution, bg, ink, amber, sage, rose, faint } })` 改金句与配色
3. 渲染抽「圈画浮现 / 定格」两帧核对

## 可改 props
- `quote` 金句 · `highlight` 圈画强调词 · `attribution` 出处/署名
- `bg` 奶油底 · `ink` 主字 · `amber` 琥珀 · `sage` 灰绿 · `rose` 玫红 · `faint` 弱色

## 设计规约
- 手写系衬线 + 手绘圈重点 + 缓慢漂移
- 温暖亲密、留白充足

## 验收
- 圈画强调到位、缓慢漂移不晃眼
- 温暖亲密氛围一致
