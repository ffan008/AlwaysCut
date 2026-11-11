import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AbsoluteFill, Img, OffthreadVideo, continueRender, delayRender, getRemotionEnvironment, useCurrentFrame, useVideoConfig } from 'remotion';
import { Video as MediaVideo } from '@remotion/media';
import { createGlRuntime, type GlRuntime } from './runtime';
import { cubeSettled, ensureCube } from './fx/cube';
import { disposeRuntimeSlot, ensureRuntimeSlot } from './runtimeSlot';
import { buildEffectShaderFrame } from './shaderFrame';
import { glPreviewFailureReason } from './previewAdapter';
import type { SelectedPreviewFallbackReason, SelectedPreviewStatusListener } from './previewAdapter';
import type { AspectFit, TimelineItem } from '../editor/types';
import { sourceFrameAt } from '../editor/sourceLimit';
import { offthreadTrimBefore, offthreadVideoTransparent, useRuntimeVideoDecoder } from '../editor/serverVideoDecoder';
import { glEffects } from './clipEffects';
import { getMattingSegmenter } from '../matting/segmenterCache';
import type { MattingSegmenter } from '../matting/segment';
import type { MattingMask } from '../../shared/matting.ts';
import aiMattingFrag from './fx/ai-matting.frag.ts';

// Matting is expensive (MediaPipe 256×256 GPU inference on every frame). Still
// images never change, and video frames change slowly for the intended use
// (talking-head / product / b-roll), so we compute one mask per
// MATTING_SAMPLE_EVERY frames and reuse it in between. At 30fps this is a
// ~0.2s refresh — imperceptible — while cutting inference cost ~6×.
const MATTING_SAMPLE_EVERY = 6;

// One video/image clip rendered through a builtin:fx-* single-input WebGL pass.
// Mounts a hidden, frame-synced media
// element (Remotion keeps it accurate in preview AND headless render),
// rasterizes it to a 2D staging canvas with the clip's contain/cover layout,
// then runs the effect's fragment shader to the visible canvas (with alpha, so
// luma-key etc. composite over lower tracks). Registered effects are flattened
// into one ordered pass graph, preserving the clip's effects[] order.

interface ClipFxProps {
  item: TimelineItem;
  fit: AspectFit;
  width: number;
  height: number;
  frameOffset?: number;
  onPreviewStatus?: SelectedPreviewStatusListener;
}

// contain/cover placement matching MediaFill's objectFit, so GL frames align
// with the rest of the composition.
function drawFit(ctx: CanvasRenderingContext2D, source: CanvasImageSource, fit: AspectFit): void {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const dimensions = source as CanvasImageSource & {
    videoWidth?: number;
    videoHeight?: number;
    naturalWidth?: number;
    naturalHeight?: number;
    displayWidth?: number;
    displayHeight?: number;
    width?: number;
    height?: number;
  };
  const nw = dimensions.videoWidth
    ?? dimensions.naturalWidth
    ?? dimensions.displayWidth
    ?? dimensions.width
    ?? 0;
  const nh = dimensions.videoHeight
    ?? dimensions.naturalHeight
    ?? dimensions.displayHeight
    ?? dimensions.height
    ?? 0;
  ctx.clearRect(0, 0, W, H);
  if (!nw || !nh) return;
  const scale = fit === 'cover' ? Math.max(W / nw, H / nh) : Math.min(W / nw, H / nh);
  const dw = nw * scale;
  const dh = nh * scale;
  ctx.drawImage(source, (W - dw) / 2, (H - dh) / 2, dw, dh);
}

export function ClipFx({ item, fit, width, height, frameOffset = 0, onPreviewStatus }: ClipFxProps) {
  const frame = useCurrentFrame() + frameOffset;
  const { fps } = useVideoConfig();
  const isRendering = getRemotionEnvironment().isRendering;
  // Same decoder as the plain layers (RuntimeVideo): a Windows export must not
  // reach the WebCodecs decode through an effect clip either (#162), and one
  // decoder per export keeps effect inputs in lockstep with their neighbours.
  const videoDecoder = useRuntimeVideoDecoder();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceLayerRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<GlRuntime | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const failedAdapterRef = useRef<{ definitionKey: string; reason: SelectedPreviewFallbackReason } | null>(null);
  const stagedRenderKeyRef = useRef<string | null>(null);
  const hasRenderedRef = useRef(false);
  const [hasRendered, setHasRendered] = useState(false);
  const trimBefore = sourceFrameAt(item, frameOffset);

  const staging = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    return c;
  }, [width, height]);

  const active = useMemo(() => glEffects(item), [item]);
  // AI matting is the one effect that needs a per-frame segmenter mask, which
  // the single-input FxPass graph cannot express. When present it takes over
  // the render path below (renderMatting instead of renderFxChain).
  const mattingEntry = useMemo(() => active.find(({ def }) => def.matting) ?? null, [active]);
  const segmenterRef = useRef<MattingSegmenter | null>(null);
  const [mattingReady, setMattingReady] = useState(false);
  const mattingCacheRef = useRef<{ key: string; mask: MattingMask } | null>(null);

  useEffect(() => {
    if (!mattingEntry) return;
    let cancelled = false;
    segmenterRef.current = null;
    setMattingReady(false);
    getMattingSegmenter().then((segmenter) => {
      if (cancelled) return;
      segmenterRef.current = segmenter;
      setMattingReady(true);
    }).catch((error) => {
      if (!cancelled) console.error('[clip-fx] matting segmenter load failed', error);
    });
    return () => { cancelled = true; };
  }, [mattingEntry?.def.id]);
  const definitionKey = useMemo(
    () => active.map(({ def }) => `${def.id}:${def.frag}`).join('\u0000'),
    [active],
  );
  const renderKey = useMemo(
    () => JSON.stringify([frame, fit, width, height, active.map(({ fx }) => [fx.id, fx.overrides])]),
    [frame, fit, width, height, active],
  );
  const onVideoFrame = useCallback(
    (source: CanvasImageSource) => {
      const ctx = staging.getContext('2d');
      if (!ctx) return;
      drawFit(ctx, source, fit);
      stagedRenderKeyRef.current = renderKey;
    },
    [fit, renderKey, staging],
  );
  // <OffthreadVideo> reloads its image element whenever onVideoFrame changes
  // identity, just as it revokes that frame's blob URL for the next frame —
  // one failed-load warning per rendered frame. A stable callback stages under
  // the latest key instead: a server render mounts the next frame's image only
  // after this frame's key is committed.
  const offthreadTargetRef = useRef({ fit, renderKey });
  useLayoutEffect(() => {
    offthreadTargetRef.current = { fit, renderKey };
  }, [fit, renderKey]);
  const onOffthreadVideoFrame = useCallback(
    (source: CanvasImageSource) => {
      const ctx = staging.getContext('2d');
      if (!ctx) return;
      const target = offthreadTargetRef.current;
      drawFit(ctx, source, target.fit);
      stagedRenderKeyRef.current = target.renderKey;
    },
    [staging],
  );

  useEffect(() => {
    if (!onPreviewStatus) return;
    const targetId = item.id;
    return () => {
      onPreviewStatus({
        kind: 'effect',
        targetId,
        adapter: 'gl-effect',
        phase: 'inactive',
      });
    };
  }, [item.id, onPreviewStatus]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || active.length === 0) return;
    const handle = isRendering ? delayRender(`clip-fx ${active.map(({ def }) => def.id).join(',')}`) : null;
    let done = false;
    let raf = 0;
    const report = (phase: 'waiting' | 'ready' | 'fallback', fallbackReason?: SelectedPreviewFallbackReason) => {
      onPreviewStatus?.({
        kind: 'effect',
        targetId: item.id,
        adapter: 'gl-effect',
        phase,
        fallbackReason,
      });
    };
    const finish = () => {
      if (!done && handle != null) {
        done = true;
        continueRender(handle);
      }
    };
    const priorFailure = failedAdapterRef.current?.definitionKey === definitionKey
      ? failedAdapterRef.current.reason
      : null;
    if (priorFailure) {
      report('fallback', priorFailure);
      finish();
      return () => finish();
    }
    let waitingReported = false;
    const reportWaiting = () => {
      if (waitingReported) return;
      waitingReported = true;
      report('fallback', 'media-loading');
    };
    // .cube LUT is loaded first; tick waits until loading has settled. A failed
    // LUT is an intentional pass-through with intensity=0 in fxPasses().
    for (const { def } of active) if (def.cube) void ensureCube(def.cube);
    const tick = () => {
      const decodedVideo = item.kind !== 'image';
      const mediaReady = decodedVideo
        ? stagedRenderKeyRef.current === renderKey
        : !!imageRef.current?.complete;
      if (!mediaReady) { reportWaiting(); raf = requestAnimationFrame(tick); return; }
      if (active.some(({ def }) => def.cube && !cubeSettled(def.cube))) { reportWaiting(); raf = requestAnimationFrame(tick); return; }
      if (mattingEntry && !mattingReady) { reportWaiting(); raf = requestAnimationFrame(tick); return; }
      try {
        const runtime = ensureRuntimeSlot(runtimeRef, () => createGlRuntime(canvas));
        const ctx = staging.getContext('2d');
        if (!ctx) throw new Error('2d context unavailable');
        if (!decodedVideo && imageRef.current) drawFit(ctx, imageRef.current, fit);
        if (mattingEntry && segmenterRef.current) {
          const rawSoftness = mattingEntry.fx.overrides?.softness;
          const softness = typeof rawSoftness === 'number'
            ? Math.min(0.4, Math.max(0, rawSoftness))
            : 0.05;
          // Still images segment once; video refreshes every
          // MATTING_SAMPLE_EVERY frames. The cache key pins the source identity
          // and staging size, so a clip swap or an export-resolution change
          // invalidates cleanly and re-segments.
          const bucket = item.kind === 'image' ? 0 : Math.floor(frame / MATTING_SAMPLE_EVERY);
          const cacheKey = `${item.kind}:${item.id}:${width}x${height}:${bucket}`;
          let mask = mattingCacheRef.current?.key === cacheKey ? mattingCacheRef.current.mask : null;
          if (!mask) {
            mask = segmenterRef.current.segment(staging).mask;
            mattingCacheRef.current = { key: cacheKey, mask };
          }
          runtime.renderMatting(aiMattingFrag, staging, mask, { u_softness: softness });
        } else {
          const shaderFrame = buildEffectShaderFrame(
            active.map(({ fx, def }) => ({ def, overrides: fx.overrides })),
            frame,
            fps,
          );
          runtime.renderFxChain(shaderFrame.passes, staging);
        }
        // Make the freshly drawn canvas authoritative before unblocking export;
        // React state then preserves the same choice for subsequent renders.
        canvas.style.opacity = '1';
        if (sourceLayerRef.current) sourceLayerRef.current.style.opacity = '0';
        if (!isRendering && !hasRenderedRef.current) {
          hasRenderedRef.current = true;
          setHasRendered(true);
        }
        report('ready');
      } catch (error) {
        const reason = glPreviewFailureReason(error);
        failedAdapterRef.current = { definitionKey, reason };
        disposeRuntimeSlot(runtimeRef);
        report('fallback', reason);
        console.error('[clip-fx]', error);
      }
      finish();
    };
    tick();
    return () => { cancelAnimationFrame(raf); finish(); };
  }, [active, definitionKey, fit, staging, item.id, item.kind, frame, fps, isRendering, renderKey, onPreviewStatus, mattingEntry?.def.id, mattingReady]);

  useEffect(() => () => {
    disposeRuntimeSlot(runtimeRef);
  }, [width, height, definitionKey]);

  // Once any GL frame has been drawn, keep the canvas visible across seeks:
  // falling back to the raw source layer would flash the UNFILTERED frame for
  // the 1-2 frames until the new frame's shader pass is ready. The first
  // (never-drawn) load still falls back to the honest source while media loads.
  const showingShaderFrame = hasRendered;
  if (active.length === 0) return null;
  return (
    <AbsoluteFill>
      {/* The source is the honest Player fallback while media/GL is unavailable.
          Once this exact frame+parameter key is drawn, only the GL canvas shows. */}
      <AbsoluteFill ref={sourceLayerRef} style={{ opacity: showingShaderFrame ? 0 : 1, pointerEvents: 'none' }}>
        {item.kind === 'image'
          // impeccable-disable-next-line broken-image -- Remotion Img component, src comes from item runtime injection
          ? <Img ref={imageRef} src={item.src!} style={{ width: '100%', height: '100%', objectFit: fit }} />
          : videoDecoder === 'offthread'
            ? <OffthreadVideo src={item.src!} trimBefore={offthreadTrimBefore(trimBefore, fps)} playbackRate={item.playbackRate ?? 1} muted
                transparent={offthreadVideoTransparent(item.src!)} onVideoFrame={onOffthreadVideoFrame}
                style={{ width: '100%', height: '100%', objectFit: fit }} />
            : <MediaVideo src={item.src!} trimBefore={trimBefore} playbackRate={item.playbackRate ?? 1} muted
                headless={isRendering} onVideoFrame={onVideoFrame} style={{ width: '100%', height: '100%' }} objectFit={fit} />}
      </AbsoluteFill>
      <canvas ref={canvasRef} width={width} height={height} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: showingShaderFrame ? 1 : 0 }} />
    </AbsoluteFill>
  );
}
