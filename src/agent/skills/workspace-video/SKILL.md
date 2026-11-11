---
name: workspace-video
description: "从零做整条视频（HyperFrames 工作流）：没有实拍素材时，用 MG 动效、字卡、模板从零搭出完整成片，用于「从零做一条视频 / 没有素材 / 全动效片」。"
---

# 从零做整条视频（Workspace Video / HyperFrames）

## 适用场景

没有实拍素材，需要从零做一条视频——纯动效、纯字卡、模板拼接，常见于品牌宣言、活动预告、知识卡片、数据片、产品发布页动画。核心是用 MG 动效和模板「搭」出整条成片。

## 工作流

1. **定结构与风格**：`read_project_doc` 读 brief/treatment，把成片拆成「开场 → 主体分点 → 收尾」几段，每段对应一个 MG 场景；用 `list_templates` / `search_templates` 找可复用母版。
2. **逐段搭场景**：用 `create_motion_graphic` 或 `create_motion_graphic_from_code` 搭每段场景；模板类用 `manage_template` 套用，改参数用 `update_item_props`。
3. **排时间线**：用 `add_motion_graphic` 按叙事顺序排进时间线，配合 `view_timeline_frames` 抽帧核对。
4. **配字幕配音**：`edit_captions` 加字幕（一句一条、底部安全区），`submit_voice` 配音，`submit_music` 配乐。
5. **导出动效/成片**：整条是 MG 时用 `convert_motion_graphic_to_video` 或 `submit_render_job` 出片；混排实拍时走 `submit_export`。

## 注意事项

- 模板要改内容、改配色、改文案，别直接套用原样（会显得模板感重）。
- 场景之间要有统一的设计语言（配色/字体/动效节奏），别每段各一套。
- 纯动效片更要讲节奏：开场 3 秒要抓人，收尾要有 CTA/落版。
- 用 `place_graphics_in_safe_zone` 确保字卡不跑出安全区。

## 交付前自检

- [ ] 成片结构清晰（开场/主体/收尾），每段有 MG 场景
- [ ] 模板已改内容/配色/文案，设计语言统一
- [ ] 字幕/配音/配乐到位，节奏有张弛
- [ ] 导出前 `verify_export` 通过，动效无遮挡无卡顿
