// AI matting segmentation runtime (AlwaysCut).
//
// Loads the MediaPipe selfie segmenter — already provisioned under
// public/mediapipe/ by scripts/sync-mediapipe.mjs — and produces per-frame alpha
// masks consumed by the WebGL compositing shader (src/gl/fx/ai-matting.frag) for
// background replacement. The contract types live in shared/matting.ts.

import { MATTING_ASSETS, type MattingMask, type MattingSegmentResult } from '../../shared/matting.ts';

export type MattingFrameSource = HTMLImageElement | HTMLCanvasElement | HTMLVideoElement;

export interface MattingSegmenter {
  readonly ready: boolean;
  segment(input: MattingFrameSource): MattingSegmentResult;
  close(): void;
}

/** MediaPipe ImageSegmenter type (the package itself is loaded lazily). */
type ImageSegmenter = import('@mediapipe/tasks-vision').ImageSegmenter;

/** Mean of a byte array, 0..255. */
function meanByte(values: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) sum += values[i];
  return values.length === 0 ? 0 : sum / values.length;
}

/**
 * Create the ImageSegmenter from the provisioned WASM + selfie model.
 * Any load failure (missing WASM, model path, GPU delegate init) is wrapped with
 * a hint to re-run scripts/sync-mediapipe.mjs.
 */
async function createSegmenter(): Promise<ImageSegmenter> {
  // Heavy WASM runtime — dynamic import keeps it off the app's critical path
  // (mirrors src/geometry/mediapipe.ts).
  const { FilesetResolver, ImageSegmenter } = await import('@mediapipe/tasks-vision');
  try {
    const fileset = await FilesetResolver.forVisionTasks(MATTING_ASSETS.wasmBase);
    return await ImageSegmenter.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MATTING_ASSETS.selfieSegmenterModel, delegate: 'GPU' },
      runningMode: 'IMAGE',
      outputCategoryMask: false,
      outputConfidenceMasks: true,
    });
  } catch (error) {
    throw new Error(
      `[matting] failed to initialize MediaPipe selfie segmenter ` +
      `(wasm=${MATTING_ASSETS.wasmBase}, model=${MATTING_ASSETS.selfieSegmenterModel}). ` +
      `Run scripts/sync-mediapipe.mjs if the assets are missing.`,
      { cause: error },
    );
  }
}

export async function loadMattingSegmenter(): Promise<MattingSegmenter> {
  const segmenter = await createSegmenter();
  let closed = false;

  const segment = (input: MattingFrameSource): MattingSegmentResult => {
    if (closed) throw new Error('[matting] segmenter already closed');
    const result = segmenter.segment(input);
    try {
      const confidenceMask = result.confidenceMasks?.[0];
      if (!confidenceMask) {
        throw new Error('[matting] selfie segmenter returned no confidence mask');
      }
      const width = confidenceMask.width;
      const height = confidenceMask.height;
      // Copy: the returned mask must outlive the MediaPipe result (closed below).
      const alpha = new Uint8Array(confidenceMask.getAsUint8Array());
      const mask: MattingMask = { width, height, alpha };
      return { mask, confidence: meanByte(alpha) / 255 };
    } finally {
      result.confidenceMasks?.forEach((m) => m.close());
      result.categoryMask?.close();
      result.close();
    }
  };

  return {
    ready: true,
    segment,
    close: () => {
      if (closed) return;
      closed = true;
      segmenter.close();
    },
  };
}
