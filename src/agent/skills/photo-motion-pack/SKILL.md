---
name: photo-motion-pack
description: "多照片动态相册视频：照片卡点切换 + 每张 Ken Burns 动势 + 统一转场，用于「照片做成视频 / 相册 / 回忆视频 / 照片卡点」。"
---

# 多照片动态相册（Photo Motion Pack）

## 适用场景

把一组照片做成动态相册视频：旅行回忆、活动集锦、产品图组、婚礼/生日相册等。核心是「照片动起来 + 卡点切换 + 情绪配乐」三件事叠在一起。

## 工作流

1. **导入照片**：调用 `import_assets` 或 `import_folder` 把照片批量导入素材库，`list_templates` 看有没有可复用的相册模板。
2. **定节奏**：调用 `analyze_music`（或 `inspect_music`）拿 BPM 和段落，确定每张照片的停留时长（一般 2–4s，副歌可加速）。
3. **卡点排照片**：用 `sync_images_to_music` 或 `music_image_plan` 按节拍自动排照片、对齐切点；手动微调用 `move_item` / `set_item_timing`。
4. **逐张加动势**：按 `ken-burns-motion` 给每张照片设推近/拉远/横移关键帧，方向跟随照片重心。
5. **统一转场**：用 `manage_effects` 给照片之间加统一转场（叠化/滑动），风格一致。
6. **收尾**：加字幕/标题卡（`edit_captions` / `add_motion_graphic`），导出前 `verify_export` 抽帧核对。

## 注意事项

- 照片顺序要讲一个「起承转合」，按时间线或情绪线排，别随机堆。
- 每张照片动势方向可以有变化，但整体节奏要统一，别忽快忽慢。
- 卡点别卡太死：关键照片落在强拍即可，不必每张都硬卡。
- 竖屏相册先 `set_aspect_ratio` 确认画幅，再排照片，避免返工。

## 交付前自检

- [ ] 照片已全部导入并按叙事顺序排好
- [ ] 切换卡在节拍、停留 2–4s
- [ ] 每张照片有 Ken Burns 动势，方向服务内容
- [ ] 转场统一、配乐/字幕到位，`verify_export` 通过
