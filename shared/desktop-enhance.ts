// Local video/audio enhancement contract (AlwaysCut).
//
// Two operations share this surface: FFmpeg denoise (video hqdn3d / nlmeans,
// audio afftdn) and ONNX super-resolution (Real-ESRGAN). The minimum viable
// slice runs FFmpeg denoise in the main process, reusing the ffmpeg binary
// resolved by server/media-binaries.ts; upscale lands later on the
// native-inference worker path. Channel names, wire types and validators live
// here so main / preload / renderer stay in lockstep.

export const DESKTOP_ENHANCE_CHANNELS = {
  capabilities: 'openchatcut:enhance-capabilities',
  run: 'openchatcut:enhance-run',
  cancel: 'openchatcut:enhance-cancel',
  progress: 'openchatcut:enhance-progress',
} as const;

export type EnhanceOperation = 'denoise' | 'upscale';

export interface EnhanceDenoiseParams {
  /** 0..1; maps to an FFmpeg filter strength (e.g. hqdn3d luma_spatial). */
  readonly strength?: number;
}

export interface EnhanceUpscaleParams {
  /** Output scale factor: 2 or 4. */
  readonly scale?: number;
}

export interface EnhanceRequest {
  readonly requestId: string;
  readonly operation: EnhanceOperation;
  /** Uploads-relative source path, e.g. /media/uploads/<file>. */
  readonly sourcePath: string;
  readonly params?: EnhanceDenoiseParams | EnhanceUpscaleParams;
}

export interface EnhanceCapabilities {
  readonly denoise: { readonly available: boolean };
  readonly upscale: { readonly available: boolean; readonly reason?: string };
}

export interface EnhanceResult {
  readonly requestId: string;
  readonly operation: EnhanceOperation;
  /** Uploads-relative output path ready for the media pool. */
  readonly outputPath: string;
}

export interface EnhanceProgress {
  readonly requestId: string;
  readonly progress?: number;
}

const REQUEST_ID = /^[A-Za-z0-9_-]{8,128}$/;
const MAX_SOURCE_PATH = 2_048;

function validSourcePath(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_SOURCE_PATH
    || !value.startsWith('/media/uploads/') || value.includes('\\')) return false;
  try {
    const parsed = new URL(value, 'http://openchatcut.local');
    return parsed.origin === 'http://openchatcut.local'
      && parsed.search === ''
      && parsed.hash === '';
  } catch {
    return false;
  }
}

export function isDesktopEnhanceRequestId(value: unknown): value is string {
  return typeof value === 'string' && REQUEST_ID.test(value);
}

export function parseEnhanceRequest(value: unknown): EnhanceRequest {
  if (typeof value !== 'object' || value === null) throw new Error('invalid enhance request');
  const request = value as Partial<EnhanceRequest>;
  if (!isDesktopEnhanceRequestId(request.requestId)
    || (request.operation !== 'denoise' && request.operation !== 'upscale')
    || !validSourcePath(request.sourcePath)) {
    throw new Error('invalid enhance request');
  }
  const params = request.params as (EnhanceDenoiseParams & EnhanceUpscaleParams) | undefined;
  if (params !== undefined) {
    if (request.operation === 'denoise') {
      if (params.strength !== undefined
        && (typeof params.strength !== 'number' || params.strength < 0 || params.strength > 1)) {
        throw new Error('invalid denoise strength');
      }
    } else if (params.scale !== undefined && params.scale !== 2 && params.scale !== 4) {
      throw new Error('invalid upscale scale');
    }
  }
  return {
    requestId: request.requestId,
    operation: request.operation,
    sourcePath: request.sourcePath,
    params: request.params as EnhanceRequest['params'],
  };
}
