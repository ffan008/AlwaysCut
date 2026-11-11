// FFmpeg video denoise runner behind the desktop enhance surface.
//
// Receives a validated EnhanceRequest, resolves its /media/uploads source to a
// real disk file, applies an hqdn3d spatial-temporal denoise filter, re-encodes
// to H.264 while keeping the audio track, and writes a new upload next to the
// source. The ONNX super-resolution path (upscale) lands later on the
// native-inference worker; this module only implements the denoise slice.
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ChildProcess } from 'node:child_process';
import type { EnhanceDenoiseParams, EnhanceRequest, EnhanceResult } from '../shared/desktop-enhance.ts';
import { ffmpegBin, ffprobeBin } from './media-binaries.ts';
import {
  h264EncoderAttempts,
  h264EncoderFallbackReason,
  h264EncodingArgs,
  isHardwareH264Encoder,
  probeEncoderQualityMode,
  resolveH264Encoder,
  resolveHwDecodeArgs,
} from './media-acceleration.ts';
import { resolveUploadFile, uploadDir, uploadNameOfSource } from './media-dir.ts';
import { ffmpegThreadArgs, spawnMediaProcess } from './media-process.ts';

const FFMPEG_TIMEOUT_MS = 30 * 60_000;
const AUDIO_BITRATE = '192k';
const DEFAULT_STRENGTH = 0.5;

// In-flight FFmpeg jobs keyed by requestId so cancel() can kill the child.
const activeJobs = new Map<string, { child: ChildProcess; cancelled: boolean }>();

/** Abort an in-flight denoise job by requestId. Returns false if none matched. */
export function cancelDenoise(requestId: string): boolean {
  const job = activeJobs.get(requestId);
  if (!job) return false;
  job.cancelled = true;
  job.child.kill('SIGKILL');
  return true;
}

/** True when the source has a video stream (ffprobe), so denoise only runs on video. */
function probeHasVideoStream(inputPath: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const child = spawnMediaProcess(
      ffprobeBin(),
      ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', inputPath],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let stdout = '';
    child.stdout?.on('data', (chunk: Buffer) => { stdout += String(chunk); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) reject(new Error(`ffprobe failed with exit ${code}`));
      else resolve(stdout.trim().length > 0);
    });
  });
}

function runFfmpeg(args: string[], requestId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawnMediaProcess(
      ffmpegBin(),
      [...ffmpegThreadArgs(), ...args],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    );
    const job = { child, cancelled: false };
    activeJobs.set(requestId, job);
    let stderr = '';
    const timer = setTimeout(() => {
      activeJobs.delete(requestId);
      child.kill('SIGKILL');
      reject(new Error(`ffmpeg timed out after ${Math.round(FFMPEG_TIMEOUT_MS / 1000)}s`));
    }, FFMPEG_TIMEOUT_MS);
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += String(chunk);
      if (stderr.length > 8000) stderr = stderr.slice(-4000);
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      activeJobs.delete(requestId);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      activeJobs.delete(requestId);
      if (job.cancelled) reject(new Error('denoise cancelled'));
      else if (code === 0) resolve();
      else reject(new Error(`ffmpeg exit ${code}: ${stderr.slice(-500)}`));
    });
  });
}

/** Clamp the request strength to 0..1, defaulting to a mild denoise. */
export function denoiseStrength(params: EnhanceDenoiseParams | undefined): number {
  const raw = params?.strength;
  return typeof raw === 'number' ? Math.max(0, Math.min(1, raw)) : DEFAULT_STRENGTH;
}

/**
 * Map 0..1 strength to an hqdn3d filter string.
 *
 * hqdn3d defaults are luma_spatial=4:chroma_spatial=3:luma_tmp=6:chroma_tmp=4.5;
 * the ratios are preserved while the strength scales luma_spatial across
 * 0.8 (very light) .. 7.2 (aggressive). The default strength 0.5 reproduces the
 * stock hqdn3d values exactly.
 */
export function hqdn3dFilter(strength: number): string {
  const luma = 0.8 + strength * 6.4;
  const one = (value: number): string => value.toFixed(1);
  return `hqdn3d=${one(luma)}:${one(luma * 0.75)}:${one(luma * 1.5)}:${one(luma * 1.125)}`;
}

function denoiseStem(sourceName: string): string {
  const stem = sourceName.replace(/\.[^.]+$/, '') || sourceName;
  return stem.replace(/[^a-zA-Z0-9_\u4e00-\u9fff-]+/g, '_').slice(0, 72) || 'media';
}

/** Deterministic upload name so a repeated source+strength request reuses its cache. */
export function denoiseOutputName(sourceName: string, strength: number): string {
  return `${denoiseStem(sourceName)}.denoise.s${Math.round(strength * 100)}.mp4`;
}

// Cache metadata records the source stat at encode time so a re-run against a
// replaced source file (same name, new bytes) invalidates the stale output
// instead of silently reusing it. Stored as a sidecar JSON next to the output.
const CACHE_META_SUFFIX = '.meta.json';
interface DenoiseCacheMeta {
  readonly sourceMtimeMs: number;
  readonly sourceSize: number;
}

async function readCacheMeta(finalPath: string): Promise<DenoiseCacheMeta | null> {
  const raw = await readFile(finalPath + CACHE_META_SUFFIX, 'utf8').catch(() => null);
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<DenoiseCacheMeta>;
    if (typeof parsed.sourceMtimeMs === 'number' && typeof parsed.sourceSize === 'number') {
      return { sourceMtimeMs: parsed.sourceMtimeMs, sourceSize: parsed.sourceSize };
    }
    return null;
  } catch {
    return null;
  }
}

async function writeCacheMeta(finalPath: string, meta: DenoiseCacheMeta): Promise<void> {
  await writeFile(finalPath + CACHE_META_SUFFIX, JSON.stringify(meta));
}

async function encodeDenoised(
  inputPath: string,
  partPath: string,
  strength: number,
  requestId: string,
): Promise<void> {
  const ffmpeg = ffmpegBin();
  const preferred = await resolveH264Encoder(ffmpeg);
  const qualityMode = await probeEncoderQualityMode(ffmpeg, preferred);
  const filter = hqdn3dFilter(strength);
  let lastError: unknown;
  for (const encoder of h264EncoderAttempts(preferred)) {
    // Decode setup follows each attempt's encoder: the libx264 retry must not
    // keep a hardware decoder that may be what failed.
    const decodeArgs = await resolveHwDecodeArgs(ffmpeg, encoder);
    const args = [
      '-nostdin', '-hide_banner', '-loglevel', 'error', '-y',
      ...decodeArgs,
      '-i', inputPath,
      '-map', '0:v:0',
      '-map', '0:a:0?',
      '-vf', filter,
      ...h264EncodingArgs({
        encoder,
        softwareCrf: 18,
        softwarePreset: 'veryfast',
        ...(qualityMode ? { hardwareQuality: 23, qualityMode } : {}),
      }),
      '-profile:v', 'high',
      '-c:a', 'aac', '-b:a', AUDIO_BITRATE,
      '-movflags', '+faststart',
      partPath,
    ];
    try {
      await runFfmpeg(args, requestId);
      return;
    } catch (error) {
      lastError = error;
      if (!isHardwareH264Encoder(encoder)) throw error;
      console.warn(
        `[enhance-denoise] ${encoder} failed (${h264EncoderFallbackReason(encoder, error)}); falling back to libx264`,
      );
      await unlink(partPath).catch(() => {});
    }
  }
  throw lastError instanceof Error ? lastError : new Error('video denoise failed');
}

export async function runDenoise(request: EnhanceRequest): Promise<EnhanceResult> {
  const name = uploadNameOfSource(request.sourcePath);
  if (!name) {
    throw new Error(`enhance source must be /media/uploads/<safe-name>: ${request.sourcePath}`);
  }
  const inputPath = resolveUploadFile(name);
  if (!inputPath) throw new Error(`media not found: ${name}`);

  // Denoise is a video filter; reject audio-only sources with a clear message
  // instead of emitting a broken mp4 that has no video stream.
  if (!(await probeHasVideoStream(inputPath))) {
    throw new Error(`enhance denoise requires a video stream; audio-only source: ${name}`);
  }

  const strength = denoiseStrength(request.params as EnhanceDenoiseParams | undefined);
  const outName = denoiseOutputName(name, strength);
  const finalPath = join(uploadDir(), outName);
  const srcStat = await stat(inputPath);

  if (existsSync(finalPath)) {
    const info = await stat(finalPath).catch(() => null);
    const meta = await readCacheMeta(finalPath);
    // Reuse the cached output only when the source is byte-for-byte unchanged
    // (same mtime and size as recorded at encode time).
    const cacheValid = info?.isFile() && info.size > 0
      && meta?.sourceMtimeMs === srcStat.mtimeMs
      && meta?.sourceSize === srcStat.size;
    if (cacheValid) {
      return { requestId: request.requestId, operation: 'denoise', outputPath: `/media/uploads/${outName}` };
    }
  }

  // Keep a real .mp4 suffix on the temp file so ffmpeg picks the mp4 muxer.
  const partPath = finalPath.replace(/\.mp4$/i, `.${randomUUID()}.tmp.mp4`);
  try {
    await encodeDenoised(inputPath, partPath, strength, request.requestId);
    await rename(partPath, finalPath);
    await writeCacheMeta(finalPath, { sourceMtimeMs: srcStat.mtimeMs, sourceSize: srcStat.size });
  } finally {
    await unlink(partPath).catch(() => {});
  }
  return { requestId: request.requestId, operation: 'denoise', outputPath: `/media/uploads/${outName}` };
}
