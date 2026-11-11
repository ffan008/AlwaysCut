---
name: shadow-cut
description: "黑色电影母版（近单色+血红点缀、暗角聚光、从黑暗中浮现、停顿后重击）：安全产品/调查内容/戏剧性揭晓/悬疑向的片头卡或结论页用；模板名「黑色剪辑」，改 props 即得成品"
---

# 黑色剪辑（Shadow Cut）

## 触发场景
- 安全产品威胁揭示、调查内容开场、戏剧性揭晓、悬疑向片头卡
- 近单色 + 血红点缀 + 暗角聚光的黑色电影质感

## 何时不用
- 高能量促销 → 用「最大化字体」
- 温暖人文 → 用「柔光时刻」
- 奢侈品仪式感 → 用「天鹅绒宣言」

## 使用流程
1. `add_motion_graphic({ templateName: "黑色剪辑" })` 放置母版
2. `update_item_props({ itemId, props: { caseNo, headline, detail, verdict, bg, ink, gray, red, muted } })` 改文案与配色
3. 渲染抽「浮现中 / 停顿重击后」两帧核对

## 可改 props
- `caseNo` 案件编号 · `headline` 主标题 · `detail` 细节行 · `verdict` 结论
- `bg` 黑底 · `ink` 主字 · `gray` 灰 · `red` 血红点缀 · `muted` 弱字

## 设计规约
- 元素从黑暗中浮现 → 停顿 → 重击
- 血红只作点缀（一处），近单色克制
- 暗角聚光强化悬疑感

## 验收
- 浮现-停顿-重击节奏分明
- 血红点缀克制、近单色统一
