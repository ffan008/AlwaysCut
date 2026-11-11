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

/** Pixel dimensions of a frame source, independent of its concrete type. */
function sourceSize(input: MattingFrameSource): { width: number; height: number } {
  if (input instanceof HTMLVideoElement) {
    return { width: input.videoWidth || input.width, height: input.videoHeight || input.height };
  }
  if (input instanceof HTMLImageElement) {
    return { width: input.naturalWidth || input.width, height: input.naturalHeight || input.height };
  }
  return { width: input.width, height: input.height };
}

/**
 * Bilinear-resample a single-channel mask (0..255) from its model resolution to
 * the source frame size. The selfie segmenter always infers at 256×256 and
 * stretches the input to that square (it does not letterbox), so the raw mask is
 * only correctly aligned for square footage. Resizing it back to the source
 * dimensions lets the shader sample the mask with the same UVs as the foreground
 * texture, eliminating the non-square misalignment.
 */
function resizeMask(
  alpha: Uint8Array,
  srcW: number,
  srcH: number,
  dstW: number,
  dstH: number,
): Uint8Array {
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = srcW;
  srcCanvas.height = srcH;
  const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true })!;
  const srcImage = srcCtx.createImageData(srcW, srcH);
  for (let i = 0; i < alpha.length; i += 1) {
    const v = alpha[i]!;
    const offset = i * 4;
    srcImage.data[offset] = v;
    srcImage.data[offset + 1] = v;
    srcImage.data[offset + 2] = v;
    srcImage.data[offset + 3] = 255;
  }
  srcCtx.putImageData(srcImage, 0, 0);

  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = dstW;
  dstCanvas.height = dstH;
  const dstCtx = dstCanvas.getContext('2d', { willReadFrequently: true })!;
  dstCtx.imageSmoothingEnabled = true;
  dstCtx.imageSmoothingQuality = 'high';
  dstCtx.drawImage(srcCanvas, 0, 0, dstW, dstH);

  const dstImage = dstCtx.getImageData(0, 0, dstW, dstH);
  const out = new Uint8Array(dstW * dstH);
  for (let i = 0; i < out.length; i += 1) out[i] = dstImage.data[i * 4]!;
  return out;
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
    const { width: srcW, height: srcH } = sourceSize(input);
    const result = segmenter.segment(input);
    try {
      const confidenceMask = result.confidenceMasks?.[0];
      if (!confidenceMask) {
        throw new Error('[matting] selfie segmenter returned no confidence mask');
      }
      const maskW = confidenceMask.width;
      const maskH = confidenceMask.height;
      // Copy: the returned mask must outlive the MediaPipe result (closed below).
      const raw = new Uint8Array(confidenceMask.getAsUint8Array());
      // The segmenter infers at 256×256 (stretched, not letterboxed); resize the
      // mask back to the source frame so it shares the foreground's UV space.
      const alpha = (maskW === srcW && maskH === srcH)
        ? raw
        : resizeMask(raw, maskW, maskH, srcW, srcH);
      const mask: MattingMask = { width: srcW, height: srcH, alpha };
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
