---
name: maximalist-type
description: "最大化字体母版（红黄撞色、字体即画面、三层文字叠印、快切三幕）：重磅产品发布/里程碑宣传/促销大字报这类高能量时刻用；模板名「最大化字体」，改 props 即得成品"
---

# 最大化字体（Maximalist Type）

## 触发场景
- 「重磅产品发布」「里程碑宣传」「促销大字报」
- 红黄撞色、字体即画面的高能量时刻

## 何时不用
- 沉稳高级 → 用「天鹅绒宣言」
- 温暖人文 → 用「柔光时刻」
- 数据展示 → 用「数据条形竞赛」

## 使用流程
1. `add_motion_graphic({ templateName: "最大化字体" })` 放置母版
2. `update_item_props({ itemId, props: { ghost, act1, act2, act3, chip1, chip2, chip3, ink, paper, red, yellow } })` 改文案与配色
3. 渲染抽三幕各一帧核对快切节奏

## 可改 props
- `ghost` 幽灵压场词 · `act1`/`act2`/`act3` 三幕主词 · `chip1`/`chip2`/`chip3` 标签块
- `ink` 主字 · `paper` 纸底 · `red` 红 · `yellow` 黄

## 设计规约
- 红黄撞色、三层文字叠印、硬切三幕
- 字体即画面，主词砸入、标签块弹入

## 验收
- 三幕硬切干净、撞色冲击力足
- 大字无越界、可读性保持
