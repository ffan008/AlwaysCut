---
name: rough-to-final-workflow
description: "素材盘点到导出七阶段总流程：盘点 → 粗剪 → 精剪 → 包装 → 调色 → 混音 → 质检导出，用于「从一堆素材到成片」的完整交付，规范每阶段做什么、用什么工具、何时交接。"
---

# 素材到成片七阶段（Rough-to-Final Workflow）

## 适用场景

用户丢给你一堆素材要做成完整成片时，按七阶段走，避免「边剪边改、返工」。每阶段有明确产出和检查点，做完一阶段再进下一阶段。

## 七阶段流程

| 阶段 | 做什么 | 主要工具/skill | 产出 |
|---|---|---|---|
| 1 盘点 | 导入素材、整理归类、看一遍 | `asset-import` / `import_assets` / `list_assets` | 素材清单 + 可用判断 |
| 2 粗剪 | 挑出有用的段，排成骨架 | `detect_scenes` / `find_highlights` / `edit_item` | 时间线粗骨架 |
| 3 精剪 | 卡节奏、删冗余、顺逻辑 | `remove_silence` / `edit_gap` / `read_transcript` | 结构完整的故事线 |
| 4 包装 | 字幕、动效、标题、B-roll | `edit_captions` / `add_motion_graphic` / `b-roll-layering` | 可看但未润色的成片 |
| 5 调色 | 统一影调、修肤色 | `inspect_color` / `auto_grade` | 影调统一 |
| 6 混音 | BGM、响度、降噪 | `normalize_loudness` / `isolate_voice` / `submit_music` | 声音平衡 |
| 7 质检导出 | 五项质检 + 规范导出 | `verify_export` / `submit_export` / `track_export` | 交付成片 |

## 工作流

1. 每一步开始前先 `read_project_doc` 读 brief/treatment，让素材取舍对准目标。
2. 按七阶段顺序推进，每阶段结束用 `view_timeline_frames` 抽帧核对，再进下一阶段。
3. 每阶段的关键取舍写进 `progress`（交接单），避免换会话后重做。
4. 阶段间可小范围回溯，但不要「整体推倒重来」；已定稿的阶段尽量不再动。
5. 导出是后台任务（`submit_export` → `track_export`），完成通知里的路径才是真路径。

## 注意事项

- 七阶段是「质量门」，不是「必须都做」：纯素材剪辑可跳过调色/包装，别为流程而流程。
- 每阶段产出可独立判断，别把所有问题攒到导出前才发现。
- 涉及花钱/下大模型的生成，先在 brief 里说清再动手。

## 交付前自检

- [ ] 七阶段都已走完，每阶段有抽帧核对
- [ ] brief/treatment 与成片一致，无跑偏
- [ ] `verify_export` 五项质检通过
- [ ] 导出完成通知里的路径已确认，交付说明写清取舍与局限
