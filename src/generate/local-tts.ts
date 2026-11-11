import type { MediaAsset, TimelineState } from '../editor/types';
import type { TtsRequest } from '../../shared/desktop-tts';

/** Arguments for local (on-device) Qwen3-TTS dubbing. */
export interface LocalTtsArgs {
  readonly text: string;
  /** Uploads-relative reference audio path (/media/uploads/<name>) for voice cloning. */
  readonly refSourcePath?: string;
  /** Transcript of the reference audio (required iff refSourcePath is set). */
  readonly refText?: string;
  readonly langCode?: string;
  readonly speed?: number;
  readonly instruct?: string;
  readonly maxTokens?: number;
  readonly name?: string;
}

const newRequestId = (): string =>
  `tts-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function newId(): string {
  return crypto.randomUUID?.() ?? `tts_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function probeAudio(src: string, fps: number): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const fallback = window.setTimeout(() => resolve(Math.round(fps * 3)), 10_000);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      window.clearTimeout(fallback);
      resolve(Math.max(1, Math.round((audio.duration || 3) * fps)));
    };
    audio.onerror = () => {
      window.clearTimeout(fallback);
      resolve(Math.round(fps * 3));
    };
    audio.src = src;
  });
}

/**
 * Synthesize speech locally (Qwen3-TTS via MLX) and return it as a media asset.
 * Desktop-only; falls through to a clear error when the surface is unavailable.
 */
export async function submitLocalTts(args: LocalTtsArgs, state: TimelineState): Promise<MediaAsset> {
  const text = args.text.trim();
  if (!text) throw new Error('本地配音需要文本');
  const api = window.alwaysCutDesktop?.tts;
  if (!api) throw new Error('本地配音仅在桌面版可用');
  const capabilities = await api.getCapabilities();
  if (!capabilities.available) {
    throw new Error(capabilities.reason ?? '本地配音不可用');
  }
  const request: TtsRequest = {
    requestId: newRequestId(),
    text,
    ...(args.refSourcePath ? { refSourcePath: args.refSourcePath } : {}),
    ...(args.refText ? { refText: args.refText } : {}),
    ...(args.langCode ? { langCode: args.langCode } : {}),
    ...(args.speed !== undefined ? { speed: args.speed } : {}),
    ...(args.instruct ? { instruct: args.instruct } : {}),
    ...(args.maxTokens !== undefined ? { maxTokens: args.maxTokens } : {}),
  };
  const result = await api.run(request);
  const durationInFrames = result.durationSeconds && Number.isFinite(result.durationSeconds)
    ? Math.max(1, Math.round(result.durationSeconds * state.fps))
    : await probeAudio(result.outputPath, state.fps);
  return {
    id: newId(),
    name: args.name?.trim() || '本地配音',
    kind: 'audio',
    src: result.outputPath,
    durationInFrames,
  };
}
