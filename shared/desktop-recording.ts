// Desktop screen/window recording contract (AlwaysCut).
//
// The Electron main process enumerates capturable sources via desktopCapturer;
// the renderer drives getUserMedia + MediaRecorder and reuses the existing
// local-media import bridge to land the finished recording in the media pool.
// This file owns the IPC channel names, the wire types, and their validators so
// the main / preload / renderer layers stay in lockstep.
//
// Minimum viable slice (this round): listSources → renderer records a screen
// (optionally with microphone audio) → stop → importLocalMedia → media pool.

export const DESKTOP_RECORDING_CHANNELS = {
  listSources: 'openchatcut:recording-list-sources',
  progress: 'openchatcut:recording-progress',
} as const;

export type DesktopRecordingSourceKind = 'screen' | 'window';

export interface DesktopRecordingSourceInfo {
  readonly id: string;
  readonly kind: DesktopRecordingSourceKind;
  readonly name: string;
  /** data:image/png;base64,... thumbnail supplied by desktopCapturer. */
  readonly thumbnailDataUrl: string;
}

export type DesktopRecordingPhase = 'idle' | 'recording' | 'saving';

export interface DesktopRecordingProgress {
  readonly requestId: string;
  readonly phase: DesktopRecordingPhase;
  readonly elapsedMs?: number;
}

const REQUEST_ID = /^[A-Za-z0-9_-]{8,128}$/;
const MAX_SOURCE_ID = 256;
const MAX_SOURCE_NAME = 512;

export function isDesktopRecordingRequestId(value: unknown): value is string {
  return typeof value === 'string' && REQUEST_ID.test(value);
}

function isDesktopRecordingSourceInfo(value: unknown): value is DesktopRecordingSourceInfo {
  if (typeof value !== 'object' || value === null) return false;
  const source = value as Partial<DesktopRecordingSourceInfo>;
  return typeof source.id === 'string' && source.id.length > 0 && source.id.length <= MAX_SOURCE_ID
    && (source.kind === 'screen' || source.kind === 'window')
    && typeof source.name === 'string' && source.name.length > 0 && source.name.length <= MAX_SOURCE_NAME
    && typeof source.thumbnailDataUrl === 'string'
    && source.thumbnailDataUrl.startsWith('data:image/');
}

export function isDesktopRecordingSourceList(value: unknown): value is DesktopRecordingSourceInfo[] {
  return Array.isArray(value) && value.every(isDesktopRecordingSourceInfo);
}

export function isDesktopRecordingProgress(value: unknown): value is DesktopRecordingProgress {
  if (typeof value !== 'object' || value === null) return false;
  const progress = value as Partial<DesktopRecordingProgress>;
  return isDesktopRecordingRequestId(progress.requestId)
    && (progress.phase === 'idle' || progress.phase === 'recording' || progress.phase === 'saving')
    && (progress.elapsedMs === undefined
      || (typeof progress.elapsedMs === 'number' && Number.isFinite(progress.elapsedMs) && progress.elapsedMs >= 0));
}
