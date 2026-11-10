// FFmpeg video denoise runner behind the desktop enhance surface.
//
// Receives a validated EnhanceRequest, resolves its /media/uploads source to a
// real disk file, applies an hqdn3d spatial-temporal denoise filter, re-encodes
// to H.264 while keeping the audio track, and writes a new upload next to the
// source. The ONNX super-resolution path (upscale) lands later on the
// native-inference worker; this module only implements the denoise slice.
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { rename, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import type { EnhanceDenoiseParams, EnhanceRequest, EnhanceResult } from '../shared/desktop-enhance.ts';
import { ffmpegBin } from './media-binaries.ts';
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

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawnMediaProcess(
      ffmpegBin(),
      [...ffmpegThreadArgs(), ...args],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    );
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`ffmpeg timed out after ${Math.round(FFMPEG_TIMEOUT_MS / 1000)}s`));
    }, FFMPEG_TIMEOUT_MS);
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += String(chunk);
      if (stderr.length > 8000) stderr = stderr.slice(-4000);
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
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

async function encodeDenoised(
  inputPath: string,
  partPath: string,
  strength: number,
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
      await runFfmpeg(args);
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

  const strength = denoiseStrength(request.params as EnhanceDenoiseParams | undefined);
  const outName = denoiseOutputName(name, strength);
  const finalPath = join(uploadDir(), outName);

  if (existsSync(finalPath)) {
    const info = await stat(finalPath).catch(() => null);
    if (info?.isFile() && info.size > 0) {
      return { requestId: request.requestId, operation: 'denoise', outputPath: `/media/uploads/${outName}` };
    }
  }

  // Keep a real .mp4 suffix on the temp file so ffmpeg picks the mp4 muxer.
  const partPath = finalPath.replace(/\.mp4$/i, `.${randomUUID()}.tmp.mp4`);
  try {
    await encodeDenoised(inputPath, partPath, strength);
    await rename(partPath, finalPath);
  } finally {
    await unlink(partPath).catch(() => {});
  }
  return { requestId: request.requestId, operation: 'denoise', outputPath: `/media/uploads/${outName}` };
}
