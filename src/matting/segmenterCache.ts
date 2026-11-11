// Shared selfie-segmenter singleton (AlwaysCut).
//
// Loading the MediaPipe WASM + selfie model is expensive and must happen once
// per app session, not once per clip. ClipFx (and any future matting consumer)
// resolves the same MattingSegmenter through getMattingSegmenter(); a failed
// load clears the pending promise so a later clip can retry instead of holding
// a rejected one forever.

import { loadMattingSegmenter, type MattingSegmenter } from './segment';

let pending: Promise<MattingSegmenter> | null = null;

export function getMattingSegmenter(): Promise<MattingSegmenter> {
  if (!pending) {
    pending = loadMattingSegmenter().catch((error) => {
      pending = null; // allow a retry after a failed load
      throw error;
    });
  }
  return pending;
}
