// Local text-to-speech (Qwen3-TTS / MLX) contract for AlwaysCut.
//
// Mirrors the desktop-enhance surface: a capabilities probe plus a one-shot
// run operation that synthesizes speech from text, optionally cloning the
// voice of a reference audio clip already present in the media pool. The heavy
// lifting runs in a Python sidecar (mlx_audio) spawned by the main process;
// this module only owns channel names, wire types and validators so main /
// preload / renderer stay in lockstep.

export const DESKTOP_TTS_CHANNELS = {
  capabilities: 'alwayscut:tts-capabilities',
  run: 'alwayscut:tts-run',
  cancel: 'alwayscut:tts-cancel',
} as const;

export interface TtsRequest {
  readonly requestId: string;
  /** Text to synthesize. */
  readonly text: string;
  /** Uploads-relative reference audio path for voice cloning (optional). */
  readonly refSourcePath?: string;
  /** Transcript of the reference audio. Required iff refSourcePath is set. */
  readonly refText?: string;
  /** Language code (zh/en/ja/ko/...), defaults to zh. */
  readonly langCode?: string;
  /** Playback speed multiplier (0.5–2.0). */
  readonly speed?: number;
  /** Style/emotion instruction for the voice. */
  readonly instruct?: string;
  /** Maximum speech tokens to generate. */
  readonly maxTokens?: number;
}

export interface TtsCapabilities {
  readonly available: boolean;
  /** Human-readable reason when unavailable. */
  readonly reason?: string;
  /** Resolved model path/id when available. */
  readonly model?: string;
}

export interface TtsResult {
  readonly requestId: string;
  /** Uploads-relative output path (WAV) ready for the media pool. */
  readonly outputPath: string;
  /** Approximate duration in seconds, when the sidecar reports it. */
  readonly durationSeconds?: number;
}

const REQUEST_ID = /^[A-Za-z0-9_-]{8,128}$/;
const MAX_TEXT = 2_000;
const MAX_REF_TEXT = 2_000;
const MAX_INSTRUCT = 500;
const LANGUAGE = /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{2,8})?$/;
const MAX_SOURCE_PATH = 2_048;

export function isDesktopTtsRequestId(value: unknown): value is string {
  return typeof value === 'string' && REQUEST_ID.test(value);
}

function validSourcePath(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_SOURCE_PATH
    || !value.startsWith('/media/uploads/') || value.includes('\\')) return false;
  try {
    const parsed = new URL(value, 'http://alwayscut.local');
    return parsed.origin === 'http://alwayscut.local'
      && parsed.search === ''
      && parsed.hash === '';
  } catch {
    return false;
  }
}

export function parseTtsRequest(value: unknown): TtsRequest {
  if (typeof value !== 'object' || value === null) throw new Error('invalid TTS request');
  const request = value as Partial<TtsRequest>;
  if (!isDesktopTtsRequestId(request.requestId)
    || typeof request.text !== 'string'
    || request.text.trim().length === 0
    || request.text.length > MAX_TEXT) {
    throw new Error('invalid TTS request');
  }
  if ((request.refSourcePath === undefined) !== (request.refText === undefined)) {
    throw new Error('refSourcePath and refText must be provided together');
  }
  if (request.refSourcePath !== undefined && !validSourcePath(request.refSourcePath)) {
    throw new Error('invalid TTS reference source');
  }
  if (request.refText !== undefined
    && (typeof request.refText !== 'string' || request.refText.length > MAX_REF_TEXT)) {
    throw new Error('invalid TTS reference text');
  }
  if (request.langCode !== undefined && !LANGUAGE.test(request.langCode)) {
    throw new Error('invalid TTS language code');
  }
  if (request.speed !== undefined
    && (typeof request.speed !== 'number' || !Number.isFinite(request.speed)
      || request.speed < 0.5 || request.speed > 2)) {
    throw new Error('invalid TTS speed');
  }
  if (request.instruct !== undefined
    && (typeof request.instruct !== 'string' || request.instruct.length > MAX_INSTRUCT)) {
    throw new Error('invalid TTS instruction');
  }
  if (request.maxTokens !== undefined
    && (typeof request.maxTokens !== 'number' || !Number.isInteger(request.maxTokens)
      || request.maxTokens < 1 || request.maxTokens > 32_768)) {
    throw new Error('invalid TTS max tokens');
  }
  return {
    requestId: request.requestId,
    text: request.text,
    ...(request.refSourcePath !== undefined ? { refSourcePath: request.refSourcePath } : {}),
    ...(request.refText !== undefined ? { refText: request.refText } : {}),
    ...(request.langCode !== undefined ? { langCode: request.langCode } : {}),
    ...(request.speed !== undefined ? { speed: request.speed } : {}),
    ...(request.instruct !== undefined ? { instruct: request.instruct } : {}),
    ...(request.maxTokens !== undefined ? { maxTokens: request.maxTokens } : {}),
  };
}

export function isDesktopTtsResult(value: unknown): value is TtsResult {
  if (typeof value !== 'object' || value === null) return false;
  const result = value as Partial<TtsResult>;
  return isDesktopTtsRequestId(result.requestId)
    && typeof result.outputPath === 'string'
    && validSourcePath(result.outputPath)
    && (result.durationSeconds === undefined
      || (typeof result.durationSeconds === 'number' && Number.isFinite(result.durationSeconds)));
}

export function isDesktopTtsCapabilities(value: unknown): value is TtsCapabilities {
  if (typeof value !== 'object' || value === null) return false;
  const caps = value as Partial<TtsCapabilities>;
  if (typeof caps.available !== 'boolean') return false;
  if (caps.reason !== undefined && typeof caps.reason !== 'string') return false;
  if (caps.model !== undefined && typeof caps.model !== 'string') return false;
  return true;
}
