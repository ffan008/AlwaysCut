---
name: short-video-factory
description: "选题/文稿一条龙出片：从选题到文案到配音到画面到成片，用于「帮我做一条短视频 / 不知道做什么选题 / 从零出片」。"
---

# 短视频一条龙工厂（Short Video Factory）

## 适用场景

用户想要一条短视频，但只给了模糊方向或什么都没给。这条技能把「选题 → 文案 → 配音 → 画面 → 字幕 → BGM → 成片」串成流水线，一条龙出片。

## 工作流

1. **选题**：`read_project_doc` 看 brief；没有就根据领域/受众给 3 个可选选题，让用户挑或用默认。选题要「有钩子、有信息差、可执行」。
2. **文案**：走 `product-ad-video-script` 或 `explainer-video` 写脚本——开头钩子 3 秒、正文 3 个点、结尾 CTA；写成可配音的分句稿。
3. **配音**：用 `submit_voice` 生成配音，`read_transcript` 拿词级时间对齐字幕。
4. **画面**：按文案逐句配画面——有素材用 `search_media` / `search_stock_media`，没素材用 `submit_image` / `submit_video` 生成；讲步骤/数据用 `add_motion_graphic` 做字卡。
5. **合成**：用 `edit_item` 把画面按词时间排好，`edit_captions` 加字幕，`submit_music` 配 BGM，`normalize_loudness` 统一响度。
6. **收尾**：`verify_export` 五项质检，`submit_export` 导出。

## 注意事项

- 选题/文案是灵魂，宁可多花时间在钩子上，也别急着生成画面。
- 画面服务文案，逐句对齐，别「画面是画面、文字是文字」。
- 涉及生成（图/配音/视频）先确认供应商和额度，再批量提交。
- 数据、价格、功效只能用用户给的或素材里确有的，缺了留占位并列出。

## 交付前自检

- [ ] 选题有钩子、有信息差，文案分句可配音
- [ ] 配音已生成，字幕与词级时间对齐
- [ ] 画面逐句对应文案，BGM/响度到位
- [ ] `verify_export` 通过，交付说明写清选题逻辑与局限
