---
name: kinetic-type-intro
description: "大字动效片头母版（四幕：钩子大字→要点阵列→数字强调→落版，幕间白场闪切）：要给视频做开头 5-10 秒的宣传片头/标题动画/口号开场时用；模板名「大字动效片头」，改 props 即得成品"
---

# 大字动效片头（Kinetic Type Intro）

## 触发场景
- 「给这条视频做个片头」「开头加个标题动画」「来段大字开场」
- 「把这句话做成动态字幕开场」「产品宣传的 intro」「口号做成动效」

## 何时不用
- 只要一条静态标题 → 用「标题动态入场」或直接 insert 文本
- 要 logo 尾板 → 用「Logo 落版尾板」
- 数据展示 → 用「数据条形竞赛」

## 使用流程
1. `add_motion_graphic({ templateName: "大字动效片头" })` 放置母版（放最上层 overlay 轨，startFrame 0）
2. `update_item_props({ itemId, props: {...} })` 改文案与配色（见下）
3. 渲染抽 1s（钩子）/ 5s（数字）/ 7.5s（落版）三帧核对文字无越界；播放看四幕切换

## 可改 props
- `hook1`/`hook2`/`hook3` 钩子三行（hook2 是主词，用强调色）· `kicker` 钩子副标
- `pillar1`/`pillar2`/`pillar3` 三个要点词
- `statValue` 强调数字 · `statLabel` 数字标签
- `outroName` 落版名 · `outroTagline` 落版副题
- `bg` 背景 · `ink` 主字 · `accent` 强调色 · `muted` 弱字

## 设计规约（改模板时保持）
- 四幕节奏：0-2s 钩子 / 2.2-4.5s 要点 / 4.7-6.5s 数字 / 6.7-8s 落版；幕间白色闪切 0.3s
- 主字号 ≥ 96px（1280 宽）；一屏一句
- 入场 only，切幕靠闪切；缓动统一 expo.out 进大字、power3.out 进次级元素

## 验收
- 常规换文案/配色只改 props
- 抽三帧文字完整无越界、四幕切换干净无残留
- durationFrames=240（8s@30fps）
