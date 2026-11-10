// AI matting / background replacement contract (AlwaysCut).
//
// MediaPipe selfie_segmenter.tflite + @mediapipe/tasks-vision WASM are already
// provisioned by scripts/sync-mediapipe.mjs under public/mediapipe/. This file
// pins the model asset locations and the mask wire shape shared by the
// segmentation runtime (src/matting/) and the WebGL compositing shader
// (src/gl/fx/ai-matting.frag).
//
// The segmentation runs in the renderer (or an off-thread worker) and produces a
// per-frame alpha mask; the shader consumes the mask to composite the foreground
// over a replacement background.

export const MATTING_ASSETS = {
  wasmBase: '/mediapipe/wasm/',
  selfieSegmenterModel: '/mediapipe/selfie_segmenter.tflite',
} as const;

export interface MattingMask {
  readonly width: number;
  readonly height: number;
  /** Per-pixel foreground alpha, 0..255 (255 = keep foreground). Row-major. */
  readonly alpha: Uint8Array;
}

export interface MattingSegmentResult {
  readonly mask: MattingMask;
  /** Mean foreground confidence, 0..1. */
  readonly confidence: number;
}

export function isValidMattingMask(value: unknown): value is MattingMask {
  if (typeof value !== 'object' || value === null) return false;
  const mask = value as Partial<MattingMask>;
  return Number.isInteger(mask.width) && Number.isInteger(mask.height)
    && (mask.width as number) > 0 && (mask.height as number) > 0
    && mask.alpha instanceof Uint8Array
    && mask.alpha.length === (mask.width as number) * (mask.height as number);
}
