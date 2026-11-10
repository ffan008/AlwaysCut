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

// Reference for the feat/matting implementer:
//   import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision';
//   const fileset = await FilesetResolver.forVisionTasks(MATTING_ASSETS.wasmBase);
//   const segmenter = await ImageSegmenter.createFromOptions(fileset, {
//     baseOptions: { modelAssetPath: MATTING_ASSETS.selfieSegmenterModel, delegate: 'GPU' },
//     runningMode: 'IMAGE',
//     outputCategoryMask: false,
//     outputConfidenceMasks: true,
//   });
//   const result = segmenter.segment(input);
//   const mask = result.confidenceMasks?.[0]; // -> getAsUint8Array() = alpha 0..255
export async function loadMattingSegmenter(): Promise<MattingSegmenter> {
  void MATTING_ASSETS;
  void (null as unknown as MattingMask);
  throw new Error('matting segmenter not implemented (feat/matting)');
}
