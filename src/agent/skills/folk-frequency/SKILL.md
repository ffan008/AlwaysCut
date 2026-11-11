---
name: folk-frequency
description: "民俗节庆母版（玫红钴蓝太阳黄、圆体弹跳、图案重复、竖屏优先）：消费应用/美食/社区活动/节庆促销这类热闹欢快风用；模板名「民俗节庆」，改 props 即得成品"
---

# 民俗节庆（Folk Frequency）

## 触发场景
- 消费应用、美食、社区活动、节庆促销
- 热闹欢快、玫红钴蓝太阳黄撞色、圆体弹跳

## 何时不用
- 沉稳高级 → 用「天鹅绒宣言」
- 悬疑黑暗 → 用「黑色剪辑」
- 临床数据 → 用「瑞士数据脉冲」

## 使用流程
1. `add_motion_graphic({ templateName: "民俗节庆" })` 放置母版（竖屏优先，原生 720×1280）
2. `update_item_props({ itemId, props: { kicker, headline, sub, badge1, badge2, badge3, bg, ink, rose, cobalt, sun, jade } })` 改文案与配色
3. 渲染抽「图案弹入 / 主词定格」两帧核对

## 可改 props
- `kicker` 顶部小标 · `headline` 主词 · `sub` 副题 · `badge1`/`badge2`/`badge3` 三个标签
- `bg` 背景 · `ink` 主字 · `rose` 玫红 · `cobalt` 钴蓝 · `sun` 太阳黄 · `jade` 玉绿

## 设计规约
- 玫红钴蓝太阳黄撞色 + 圆体弹跳 + 上下几何图案重复弹入
- 竖屏优先

## 验收
- 撞色欢快、图案弹跳到位、主词呼吸缩放
- 竖屏布局无越界
