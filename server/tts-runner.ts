// Local Qwen3-TTS (MLX) runner behind the desktop TTS surface.
//
// Two execution paths:
//   1. Warm persistent sidecar (default): the Python sidecar loads the ~3.8 GB
//      model ONCE in --serve mode and holds it in memory. Each request is a
//      JSON line on stdin, answered by one JSON line on stdout. Requests are
//      serialized (the model is a single instance) with a small in-flight
//      queue. Voice cloning uses a reference audio already in the media pool
//      (refSourcePath + refText).
//   2. One-shot (fallback): if the sidecar fails to serve, spawn one process
//      per request (loads the model every time — slow, but correct).
//
// Output files are named by a deterministic SHA1 stem, so a repeated request
// short-circuits to the cached WAV before any synthesis runs.
import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { spawn, type ChildProcess } from 'node:child_process';
import { createInterface } from 'node:readline';
import { join } from 'node:path';
import type { TtsCapabilities, TtsRequest, TtsResult } from '../shared/desktop-tts.ts';
import { uploadDir, uploadNameOfSource, resolveUploadFile } from './media-dir.ts';

const TTS_TIMEOUT_MS = 10 * 60_000;
const STDERR_LIMIT = 8_000;

interface ActiveTtsJob {
  readonly child: ChildProcess;
  cancelled: boolean;
}

const activeJobs = new Map<string, ActiveTtsJob>();

export function cancelTts(requestId: string): boolean {
  const job = activeJobs.get(requestId);
  if (job) {
    job.cancelled = true;
    job.child.kill('SIGKILL');
    return true;
  }
  // Warm mode: the model cannot be interrupted mid-inference without killing
  // the shared process, so cancel aborts the whole warm server. A later
  // request respawns it (paying one model reload).
  if (warmServer && !warmServer.closed) {
    warmServer.closed = true;
    warmServer.child.kill('SIGKILL');
    warmServer = null;
    return true;
  }
  return false;
}

/** Python interpreter that runs the sidecar. Env override wins for dev. */
function ttsPythonBin(): string {
  const override = process.env.ALWAYSCUT_QWEN_TTS_PYTHON;
  if (override) return override;
  const suffix = process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python';
  const candidates = [
    join(import.meta.dirname, '..', '.venv-tts', suffix),
    join(process.resourcesPath ?? '', 'qwen-tts', 'venv', suffix),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return 'python3';
}

/** Sidecar script path. Env override wins for dev. */
function ttsSidecarPath(): string {
  const override = process.env.ALWAYSCUT_QWEN_TTS_SIDECAR;
  if (override) return override;
  const candidates = [
    join(import.meta.dirname, '..', 'scripts', 'qwen-tts', 'qwen_tts_sidecar.py'),
    join(process.resourcesPath ?? '', 'qwen-tts', 'qwen_tts_sidecar.py'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return candidates[0]!;
}

export function ttsCapabilities(): TtsCapabilities {
  // MLX is Apple Silicon only.
  if (process.platform !== 'darwin' || process.arch !== 'arm64') {
    return { available: false, reason: '本地配音（Qwen3-TTS / MLX）仅支持 Apple Silicon 芯片' };
  }
  const python = ttsPythonBin();
  const sidecar = ttsSidecarPath();
  if (python === 'python3') {
    return { available: false, reason: '未找到本地配音 Python 环境（.venv-tts）' };
  }
  if (!existsSync(sidecar)) {
    return { available: false, reason: '未找到本地配音侧车脚本' };
  }
  return { available: true, model: process.env.ALWAYSCUT_QWEN_TTS_MODEL ?? 'mlx-community/Qwen3-TTS-12Hz-1.7B-Base-bf16' };
}

function ttsStem(request: TtsRequest): string {
  const seed = [
    request.text,
    request.langCode ?? 'zh',
    String(request.speed ?? 1),
    request.instruct ?? '',
    request.refSourcePath ?? '',
    request.refText ?? '',
  ].join('\u0000');
  return `qwen-tts-${createHash('sha1').update(seed).digest('hex').slice(0, 12)}`;
}

interface SidecarJson {
  readonly files?: readonly string[];
  readonly error?: string;
  readonly ready?: boolean;
}

function parseSidecarJson(stdout: string): SidecarJson | null {
  const lines = stdout.split('\n');
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index]!.trim();
    if (!line.startsWith('{')) continue;
    try {
      const parsed = JSON.parse(line) as SidecarJson;
      if (Array.isArray(parsed.files) && parsed.files.length > 0) return parsed;
    } catch {
      // Not the result line; keep scanning.
    }
  }
  return null;
}

function parseJsonLine(line: string): SidecarJson | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    return JSON.parse(trimmed) as SidecarJson;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Warm persistent sidecar
// ---------------------------------------------------------------------------

interface WarmServer {
  readonly child: ChildProcess;
  closed: boolean;
}

interface WarmPending {
  readonly resolve: (json: SidecarJson) => void;
  readonly reject: (error: Error) => void;
  readonly timer: NodeJS.Timeout;
}

let warmServer: WarmServer | null = null;
let warmQueue: Promise<unknown> = Promise.resolve();
let warmPending: WarmPending | null = null;
let warmReadyResolve: (() => void) | null = null;
let warmReadyReject: ((error: Error) => void) | null = null;
let warmStderr = '';

function spawnWarmServer(): WarmServer {
  const args = [ttsSidecarPath(), '--serve', '--output_dir', uploadDir()];
  const model = process.env.ALWAYSCUT_QWEN_TTS_MODEL;
  if (model) args.push('--model', model);

  const child = spawn(ttsPythonBin(), args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, HF_HUB_OFFLINE: '1', TRANSFORMERS_OFFLINE: '1' },
    windowsHide: true,
  });

  const fail = (error: Error) => {
    if (warmReadyReject) {
      warmReadyReject(error);
      warmReadyReject = null;
      warmReadyResolve = null;
    }
    if (warmPending) {
      const pending = warmPending;
      warmPending = null;
      clearTimeout(pending.timer);
      pending.reject(error);
    }
  };

  const rl = createInterface({ input: child.stdout });
  rl.on('line', (line) => {
    const parsed = parseJsonLine(line);
    if (!parsed) return;
    if (parsed.ready === true) {
      if (warmReadyResolve) {
        warmReadyResolve();
        warmReadyResolve = null;
        warmReadyReject = null;
      }
      return;
    }
    if (warmPending) {
      const pending = warmPending;
      warmPending = null;
      clearTimeout(pending.timer);
      pending.resolve(parsed);
    }
  });

  child.stderr?.on('data', (chunk: Buffer) => {
    warmStderr = (warmStderr + String(chunk)).slice(-STDERR_LIMIT);
  });
  child.once('error', (error) => fail(error));
  child.once('close', () => {
    warmServer = null; // respawn on the next request
    fail(new Error(`本地配音服务已退出：${warmStderr.slice(-300)}`));
  });

  const server: WarmServer = { child, closed: false };
  warmServer = server;
  return server;
}

function ensureWarmServer(): Promise<WarmServer> {
  if (warmServer && !warmServer.closed) return Promise.resolve(warmServer);
  const server = spawnWarmServer();
  return new Promise((resolve, reject) => {
    warmReadyResolve = () => resolve(server);
    warmReadyReject = reject;
    // If the process already died before ready, the close handler above rejects.
  });
}

function warmRun(request: TtsRequest, refPath: string | null): Promise<SidecarJson> {
  const run = (): Promise<SidecarJson> => ensureWarmServer().then(
    (server) => new Promise<SidecarJson>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (warmPending) {
          warmPending = null;
          reject(new Error('本地配音超时'));
        }
      }, TTS_TIMEOUT_MS);
      warmPending = { resolve, reject, timer };
      const payload = {
        text: request.text,
        lang_code: request.langCode ?? 'zh',
        speed: request.speed ?? 1,
        instruct: request.instruct ?? undefined,
        max_tokens: request.maxTokens ?? undefined,
        ref_audio: refPath ?? undefined,
        ref_text: refPath ? request.refText ?? '' : undefined,
        zero_spk: refPath ? undefined : true,
        prefix: ttsStem(request),
      };
      server.child.stdin!.write(`${JSON.stringify(payload)}\n`);
    }),
  );
  const queued = warmQueue.then(run, run);
  warmQueue = queued.catch(() => undefined);
  return queued;
}

// ---------------------------------------------------------------------------
// One-shot fallback
// ---------------------------------------------------------------------------

function runSidecar(request: TtsRequest, refPath: string | null): Promise<SidecarJson> {
  return new Promise((resolve, reject) => {
    const args = [
      ttsSidecarPath(),
      '--text', request.text,
      '--lang_code', request.langCode ?? 'zh',
      '--output_dir', uploadDir(),
      '--prefix', ttsStem(request),
    ];
    if (process.env.ALWAYSCUT_QWEN_TTS_MODEL) args.push('--model', process.env.ALWAYSCUT_QWEN_TTS_MODEL);
    if (request.speed !== undefined) args.push('--speed', String(request.speed));
    if (request.instruct !== undefined) args.push('--instruct', request.instruct);
    if (request.maxTokens !== undefined) args.push('--max_tokens', String(request.maxTokens));
    if (refPath) {
      args.push('--ref_audio', refPath, '--ref_text', request.refText ?? '');
    } else {
      args.push('--zero_spk');
    }
    const child = spawn(ttsPythonBin(), args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, HF_HUB_OFFLINE: '1', TRANSFORMERS_OFFLINE: '1' },
      windowsHide: true,
    });
    activeJobs.set(request.requestId, { child, cancelled: false });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      activeJobs.delete(request.requestId);
      child.kill('SIGKILL');
      reject(new Error('本地配音超时'));
    }, TTS_TIMEOUT_MS);
    child.stdout?.on('data', (chunk: Buffer) => { stdout += String(chunk); });
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr = (stderr + String(chunk)).slice(-STDERR_LIMIT);
    });
    child.once('error', (error) => {
      clearTimeout(timer);
      activeJobs.delete(request.requestId);
      reject(error);
    });
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      const job = activeJobs.get(request.requestId);
      activeJobs.delete(request.requestId);
      if (job?.cancelled || signal === 'SIGKILL') {
        reject(new Error('本地配音已取消'));
        return;
      }
      if (code === 0) {
        const parsed = parseSidecarJson(stdout);
        if (parsed) resolve(parsed);
        else reject(new Error(`本地配音无输出：${stderr.slice(-600) || stdout.slice(-600)}`));
      } else {
        reject(new Error(`本地配音失败（退出码 ${code ?? 'null'}）：${stderr.slice(-600)}`));
      }
    });
  });
}

export async function runTts(request: TtsRequest): Promise<TtsResult> {
  let refPath: string | null = null;
  if (request.refSourcePath) {
    const name = uploadNameOfSource(request.refSourcePath);
    if (!name) throw new Error('本地配音参考音频必须是 /media/uploads/<文件名>');
    refPath = resolveUploadFile(name);
    if (!refPath) throw new Error(`本地配音参考音频不存在：${name}`);
  }

  const stem = ttsStem(request);
  const expected = join(uploadDir(), `${stem}.wav`);
  if (existsSync(expected)) {
    return { requestId: request.requestId, outputPath: `/media/uploads/${stem}.wav` };
  }

  let parsed: SidecarJson;
  try {
    parsed = await warmRun(request, refPath);
  } catch {
    // Warm path failed (no --serve, spawn error, or crash) — fall back to
    // one-shot. The one-shot load is slow but correct.
    parsed = await runSidecar(request, refPath);
  }

  if (parsed.error) throw new Error(parsed.error);
  const file = parsed.files?.[0];
  if (!file || !existsSync(file)) throw new Error('本地配音未能生成音频文件');
  const base = file.slice(file.lastIndexOf('/') + 1);
  return { requestId: request.requestId, outputPath: `/media/uploads/${base}` };
}

/** Test seam: a fresh request id for callers that need one before invoking runTts. */
export function newTtsRequestId(): string {
  return `tts-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
}
