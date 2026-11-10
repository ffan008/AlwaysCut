import { useCallback, useEffect, useRef, useState } from 'react';
import type { DesktopRecordingSourceInfo } from '../../shared/desktop-recording';

// Minimum viable screen-recording slice (renderer side).
//
// It reuses the two contracts already wired by the main process:
//   - `window.alwaysCutDesktop.recording.listSources()` to enumerate capturable
//     screens/windows (see shared/desktop-recording.ts).
//   - the MediaRecorder WebM blob is handed back to the caller, which turns it into
//     a `File` and lands it in the media pool via `importLocalMedia` (RecordPanel).
//
// The hook only owns the capture lifecycle: enumerate sources, open a desktop
// capture stream (optionally with microphone audio), record chunks, and resolve
// the finished blob on stop().

export type ScreenRecordingPhase = 'idle' | 'recording' | 'saving';

export interface ScreenRecorderState {
  readonly sources: DesktopRecordingSourceInfo[];
  readonly sourcesLoading: boolean;
  readonly selectedSourceId: string | null;
  readonly phase: ScreenRecordingPhase;
  readonly elapsedMs: number;
  readonly micEnabled: boolean;
  readonly error: string | null;
  selectSource: (id: string) => void;
  setMicEnabled: (enabled: boolean) => void;
  refreshSources: () => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<Blob | null>;
}

interface DesktopVideoConstraints {
  mandatory: {
    chromeMediaSource: 'desktop';
    chromeMediaSourceId: string;
  };
}

const TIMER_INTERVAL_MS = 250;
const CHUNK_INTERVAL_MS = 1000;

function recorderMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  for (const candidate of ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return undefined;
}

function errorMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message;
  if (typeof reason === 'string') return reason;
  return 'Unknown error';
}

export function useScreenRecorder(): ScreenRecorderState {
  const [sources, setSources] = useState<DesktopRecordingSourceInfo[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [phase, setPhase] = useState<ScreenRecordingPhase>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [micEnabled, setMicEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const releaseStream = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    recorderRef.current = null;
  }, []);

  const refreshSources = useCallback(async () => {
    const bridge = window.alwaysCutDesktop?.recording;
    if (!bridge) {
      setError('Screen recording is only available in the desktop app.');
      return;
    }
    setSourcesLoading(true);
    setError(null);
    try {
      const list = await bridge.listSources();
      setSources(list);
      setSelectedSourceId((current) => current ?? list[0]?.id ?? null);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setSourcesLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSources();
  }, [refreshSources]);

  const start = useCallback(async () => {
    if (phase !== 'idle') return;
    const bridge = window.alwaysCutDesktop?.recording;
    if (!bridge) {
      setError('Screen recording is only available in the desktop app.');
      return;
    }
    if (!selectedSourceId) {
      setError('Select a screen or window first.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Screen capture is not supported in this environment.');
      return;
    }
    setError(null);
    try {
      // Electron desktop capture: `chromeMediaSourceId` comes from listSources(),
      // while `audio` stays a normal microphone constraint and is merged into the
      // same stream.
      const constraints: MediaStreamConstraints = {
        audio: micEnabled,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: selectedSourceId,
          },
        } as DesktopVideoConstraints as unknown as MediaTrackConstraints,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const mimeType = recorderMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
      };
      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.start(CHUNK_INTERVAL_MS);
      startedAtRef.current = performance.now();
      setElapsedMs(0);
      setPhase('recording');
      timerRef.current = window.setInterval(() => {
        setElapsedMs(Math.round(performance.now() - startedAtRef.current));
      }, TIMER_INTERVAL_MS);
    } catch (reason) {
      setError(errorMessage(reason));
    }
  }, [phase, selectedSourceId, micEnabled]);

  const stop = useCallback((): Promise<Blob | null> => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      clearTimer();
      releaseStream();
      setPhase('idle');
      return Promise.resolve(null);
    }
    setPhase('saving');
    return new Promise<Blob | null>((resolve) => {
      recorder.onstop = () => {
        const type = recorder.mimeType || 'video/webm';
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        clearTimer();
        releaseStream();
        setPhase('idle');
        resolve(blob);
      };
      try {
        recorder.stop();
      } catch (reason) {
        clearTimer();
        releaseStream();
        setPhase('idle');
        setError(errorMessage(reason));
        resolve(null);
      }
    });
  }, [clearTimer, releaseStream]);

  // On unmount: stop the recorder if it is still running and release every track,
  // so the OS does not keep the capture session (and its privacy indicator) alive.
  useEffect(() => {
    return () => {
      clearTimer();
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          /* already stopped */
        }
      }
      releaseStream();
    };
  }, [clearTimer, releaseStream]);

  const selectSource = useCallback((id: string) => {
    if (phase === 'idle') setSelectedSourceId(id);
  }, [phase]);

  return {
    sources,
    sourcesLoading,
    selectedSourceId,
    phase,
    elapsedMs,
    micEnabled,
    error,
    selectSource,
    setMicEnabled,
    refreshSources,
    start,
    stop,
  };
}
