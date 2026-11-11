---
name: deconstructed-glitch
description: "解构工业故障风母版（锈橙+扫描线+RGB 错位砸入+倾斜破框）：科技发布/安全产品/朋克式揭幕的粗粝工业风标题页用；模板名「解构故障」，改 props 即得成品"
---

# 解构故障（Deconstructed Glitch）

## 触发场景
- 「科技发布」「安全产品揭幕」「朋克式标题页」
- 锈橙 + 扫描线 + RGB 错位砸入 + 倾斜破框的粗粝工业风

## 何时不用
- 沉稳高级 → 用「天鹅绒宣言」
- 温暖人文 → 用「柔光时刻」
- 临床数据 → 用「瑞士数据脉冲」

## 使用流程
1. `add_motion_graphic({ templateName: "解构故障" })` 放置母版
2. `update_item_props({ itemId, props: { tag, headline, sub, issue, bg, ink, accent, cold, line } })` 改文案与配色
3. 渲染抽「RGB 错位 / 合体定格」两帧核对

## 可改 props
- `tag` 标签 · `headline` 主标题 · `sub` 副题 · `issue` 期号/编号
- `bg` 深底 · `ink` 主字 · `accent` 锈橙 · `cold` 冷色（RGB 错位层）· `line` 扫描线

## 设计规约
- RGB 错位三层叠印砸入 + 扫描线呼吸 + 倾斜破框标题
- 锈橙 + 冷色对比，粗粝工业质感

## 验收
- RGB 错位→合体节奏分明、扫描线呼吸到位
- 倾斜破框标题可读、锈橙条拉出
