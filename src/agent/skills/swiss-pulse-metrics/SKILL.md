---
name: swiss-pulse-metrics
description: "瑞士数据脉冲母版（黑底电蓝、12 列网格、巨型数字滚动）：SaaS 面板/开发者工具/数据指标/季度成绩单这类「临床精准」风格的关键数字展示页用；模板名「瑞士数据脉冲」，改 props 即得成品"
---

# 瑞士数据脉冲（Swiss Pulse Metrics）

## 触发场景
- 「季度成绩单」「关键数字展示」「SaaS 面板指标」
- 临床精准、克制、数据至上的黑底电蓝风格

## 何时不用
- 品牌宣言/仪式感 → 用「天鹅绒宣言」
- 一组对比数据 → 用「数据条形竞赛」
- 高能量 → 用「最大化字体」

## 使用流程
1. `add_motion_graphic({ templateName: "瑞士数据脉冲" })` 放置母版
2. `update_item_props({ itemId, props: { kicker, metricNumber, metricSuffix, headline, delta, footnote, bg, ink, accent, muted, line } })` 改数据与配色
3. 渲染抽「数字滚动中 / 定格后」两帧核对数值

## 可改 props
- `kicker` 顶部小标 · `metricNumber` 巨型数字 · `metricSuffix` 数字后缀（如 %/万/倍）· `headline` 说明行 · `delta` 环比/同比 · `footnote` 脚注
- `bg` 黑底 · `ink` 主字 · `accent` 电蓝 · `muted` 弱字 · `line` 网格线

## 验收
- 数字滚动到位（tabular-nums 防跳动）
- 12 列网格（竖屏 6 列）整齐划出
- 电蓝只作强调，整体克制
