---
name: interview-two-cam
description: "双机位/双人访谈的 A/B 机位切换与跳剪遮挡：音频对齐两机位，用另一机位遮挡跳剪。"
---

# 双机位 / 双人访谈（Interview Two Cam）

## 适用场景

双机位或双人访谈素材（同一时刻两个角度 / 两台机位）的 A/B 机位切换，以及内容剪辑后跳剪处用另一机位遮挡。

## 工作流

1. 对齐机位：用 `multicam_sync` 做音频对齐，把两个机位的画面与参考机位音频对齐，不要手算 offset。
2. 内容剪辑：用 `read_script` + `apply_script` 做语义剪辑（去口误、删停顿、重排），用 `clean_script` 做机械清理；这会产生跳剪点。
3. A/B 切换：在跳剪处用 `change_cam` 切到另一机位遮挡跳剪，让画面连续。
4. 调整切换点：用 `split_item` / `edit_item` 微调切点，让切换落在自然语意边界。

## 注意事项

- 不要用 `edit_item` 手算源偏移对齐机位，用 `multicam_sync`。
- 单条跨越主轨 cut 的素材，先 `split_item` 再 `multicam_sync`。
- 切换机位时音频和口型必须保持同步。

## 交付前自检

- 用 `view_timeline_frames` 确认切换自然、音画同步、无跳剪外露。
- 用 `undo_last_change` 回退不合适的切换。
