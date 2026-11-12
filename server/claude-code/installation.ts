import { execFile } from 'node:child_process';
import { constants } from 'node:fs';
import { access, readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { delimiter, dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { claudeCodeCommand } from './command.ts';

const VERSION_TIMEOUT_MS = 10_000;
const VERSION_OUTPUT_LIMIT = 16 * 1024;
/**
 * Floor covering every flag this backend passes: --mcp-config / --strict-mcp-config /
 * --output-format stream-json, plus the sandbox flags added for the hardened turn
 * run (--restricted, --disallowedTools, --permission-prompts). 2.1.263 is the version
 * that combination was verified against; an older CLI must not be driven with it.
 */
export const MINIMUM_CLAUDE_CODE_VERSION = '2.1.263';

export interface ClaudeCodeInstallation {
  readonly installed: boolean;
  readonly supported: boolean;
  readonly path: string | null;
  readonly version: string | null;
}

function executableNames(name = 'claude'): string[] {
  if (process.platform !== 'win32' || /\.(?:exe|cmd|bat)$/i.test(name)) return [name];
  return [`${name}.exe`, `${name}.cmd`, `${name}.bat`];
}

function pathCandidates(name: string): string[] {
  const entries = (process.env.PATH ?? '').split(delimiter).filter(Boolean);
  return entries.flatMap((entry) => executableNames(name).map((file) => join(entry, file)));
}

function configuredCandidates(): string[] {
  const configured = process.env.ALWAYSCUT_CLAUDE_CODE_PATH?.trim();
  if (!configured) return [];
  if (isAbsolute(configured) || configured.includes(sep) || configured.includes('/')) {
    return [resolve(configured)];
  }
  return pathCandidates(configured);
}

function commonCandidates(): string[] {
  const home = homedir();
  if (process.platform === 'win32') {
    return [
      process.env.APPDATA ? join(process.env.APPDATA, 'npm', 'claude.cmd') : '',
      process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Programs', 'claude', 'claude.exe') : '',
      process.env.USERPROFILE ? join(process.env.USERPROFILE, '.local', 'bin', 'claude.exe') : '',
    ].filter(Boolean);
  }
  return [
    join(home, '.local', 'bin', 'claude'),
    join(home, '.npm-global', 'bin', 'claude'),
    join(home, '.bun', 'bin', 'claude'),
    join(home, '.volta', 'bin', 'claude'),
    '/opt/homebrew/bin/claude',
    '/usr/local/bin/claude',
    '/usr/bin/claude',
  ];
}

/**
 * Version-manager installs (`npm i -g` under nvm/fnm/asdf/n) place the CLI
 * inside `…/node/<version>/bin`, which neither the GUI process's trimmed PATH
 * nor the hard-coded `commonCandidates` list covers. Scan those directories so
 * a CLI installed through a Node version manager is still detected. Version ids
 * sort newest-first so the latest toolchain (which usually ships the newest CLI)
 * wins the first-executable selection below.
 */
function versionIdParts(value: string): readonly number[] {
  return value.replace(/^v/i, '').split(/[._-]/, 3).map((part) => Number.parseInt(part, 10) || 0);
}

function compareVersionIds(a: string, b: string): number {
  const pa = versionIdParts(a);
  const pb = versionIdParts(b);
  for (let index = 0; index < 3; index += 1) {
    if (pa[index] !== pb[index]) return pa[index] - pb[index];
  }
  return 0;
}

async function nodeManagerCandidates(name: string): Promise<string[]> {
  if (process.platform === 'win32') return [];
  const home = homedir();
  const roots: ReadonlyArray<{ readonly root: string; readonly suffix: readonly string[] }> = [
    { root: join(home, '.nvm', 'versions', 'node'), suffix: ['bin'] },
    { root: join(home, '.fnm', 'node-versions'), suffix: ['installation', 'bin'] },
    { root: join(home, '.asdf', 'installs', 'nodejs'), suffix: ['bin'] },
    { root: join(home, '.n', 'versions', 'node'), suffix: ['bin'] },
  ];
  const candidates: string[] = [];
  for (const { root, suffix } of roots) {
    let entries: string[];
    try {
      entries = await readdir(root);
    } catch {
      continue;
    }
    entries.sort((a, b) => compareVersionIds(b, a));
    for (const entry of entries) candidates.push(join(root, entry, ...suffix, name));
  }
  // nvm `current` / `default` aliases, which resolve to the active version.
  candidates.push(join(home, '.nvm', 'current', 'bin', name));
  return candidates;
}

async function executable(candidate: string): Promise<boolean> {
  try {
    const info = await stat(candidate);
    if (!info.isFile()) return false;
    if (process.platform !== 'win32') await access(candidate, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export async function resolveClaudeCodeCli(): Promise<string | null> {
  const candidates = [
    ...configuredCandidates(),
    ...pathCandidates('claude'),
    ...commonCandidates(),
    ...await nodeManagerCandidates('claude'),
  ];
  const unique = [...new Set(candidates)];
  const checks = await Promise.all(unique.map(async (candidate) => ({
    candidate,
    executable: await executable(candidate),
  })));
  return checks.find((check) => check.executable)?.candidate ?? null;
}

function parseVersion(output: string): string | null {
  const match = output.match(/\b(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)\b/);
  return match?.[1] ?? null;
}

function versionParts(version: string): readonly number[] {
  return version.split(/[.+-]/, 3).map((part) => Number.parseInt(part, 10));
}

export function isSupportedClaudeCodeVersion(version: string | null): boolean {
  if (!version) return false;
  const actual = versionParts(version);
  const minimum = versionParts(MINIMUM_CLAUDE_CODE_VERSION);
  for (let index = 0; index < minimum.length; index += 1) {
    if (actual[index] !== minimum[index]) return (actual[index] ?? 0) > (minimum[index] ?? 0);
  }
  return true;
}

/**
 * Prepend the CLI's own bin directory to PATH so a `#!/usr/bin/env node` shebang
 * resolves even inside the GUI process, whose PATH omits Node version-manager
 * directories (nvm/fnm/asdf). Harmless for native single-file binaries.
 */
function cliChildEnv(cliPath: string): NodeJS.ProcessEnv {
  const binDir = dirname(cliPath);
  const existing = process.env.PATH ?? process.env.Path ?? '';
  return { ...process.env, PATH: `${binDir}${delimiter}${existing}` };
}

async function readVersion(path: string): Promise<string | null> {
  const command = claudeCodeCommand(path, ['--version']);
  const { promise, resolve } = Promise.withResolvers<string | null>();
  execFile(command.executable, command.args, {
    encoding: 'utf8',
    timeout: VERSION_TIMEOUT_MS,
    maxBuffer: VERSION_OUTPUT_LIMIT,
    windowsHide: true,
    windowsVerbatimArguments: command.windowsVerbatimArguments,
    env: cliChildEnv(path),
  }, (error, stdout, stderr) => {
    resolve(error ? null : parseVersion(`${stdout}\n${stderr}`));
  });
  return promise;
}

export async function inspectClaudeCodeInstallation(): Promise<ClaudeCodeInstallation> {
  const path = await resolveClaudeCodeCli();
  if (!path) return { installed: false, supported: false, path: null, version: null };
  const version = await readVersion(path);
  return { installed: true, supported: isSupportedClaudeCodeVersion(version), path, version };
}
