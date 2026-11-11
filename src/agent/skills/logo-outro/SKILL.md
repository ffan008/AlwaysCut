---
name: logo-outro
description: "视频结尾 logo 落版母版（词标逐件组装+辉光呼吸一次+CTA 淡入+完全定格）：要给视频做片尾/logo 收尾/结尾行动号召画面时用；模板名「Logo 落版尾板」，改 props 即得成品"
---

# Logo 落版尾板（Logo Outro）

## 触发场景
- 「给视频加个片尾」「结尾放个 logo」
- 「最后定格在品牌名上」「片尾加一句关注我」
- 「做个 outro」

## 何时不用
- 片尾只要一行静态字 → 直接 insert 文本即可
- 开场片头 → 用「大字动效片头」
- 品牌名 + 订阅引导的完整片尾板才是本母版场景

## 使用流程
1. `add_motion_graphic({ templateName: "Logo 落版尾板" })` 放置母版（放最上层 overlay 轨，startFrame 与成片结尾对齐）
2. `update_item_props({ itemId, props: { name, cta, subLine, bg, ink, accent, muted } })` 改品牌名/CTA/配色
3. 渲染抽「组装中 / 定格后」两帧核对；播结尾 5 秒

## 可改 props
- `name` 词标（空格分词逐件组装；中文整句就一个词）· `cta` 行动号召 · `subLine` 副行（可留空）
- `bg` 深底 · `ink` 主字 · `accent` 强调色（只用于分隔点/下划线一处）· `muted` 弱字

## 设计规约（改模板时保持）
- 词标逐件组装 → 辉光呼吸一次（1.7-2.4s）→ CTA 淡入（2.6s）→ 3.2s 后**完全定格**
- 辉光是强调不是装饰，只呼吸一次不循环
- 定格段（片尾最后 1.8s）零动画——循环动画会晃眼

## 验收
- 播放结尾 5 秒：3.2s 后画面完全静止
- 辉光只呼吸一次、无循环闪烁
- 词标/CTA 完整、定格帧无运动
