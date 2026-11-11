// Per-project "director memory" documents (the Pro 6-doc model):
// brief / treatment / progress / analysis / timeline / objects, plus suffixed
// variants (analysis-<slug>, timeline-<slug>, objects-<slug>, brief-<slug>,
// treatment-<slug>) for multi-reference / multi-deliverable projects.
//
// Stored as a decoupled sidecar (like chat), NOT inside the undoable ProjectDoc:
// these docs are "rewrite, not append" working memory that must survive a
// session change without being part of the timeline's undo history.
import { kvGet, kvSet, kvDel } from './sharedKv';

const projectDocKey = (id: string) => `project-doc:${id}`;

/** The six base document names of the director model. */
export const PROJECT_DOC_BASES = [
  'brief',
  'treatment',
  'progress',
  'analysis',
  'timeline',
  'objects',
] as const;

export type ProjectDocBase = (typeof PROJECT_DOC_BASES)[number];

const SUFFIX_RE = /^[a-z0-9-]+$/;

/** A valid doc name: one of the six bases, or a base plus a slug suffix. */
export function isValidProjectDocName(name: string): boolean {
  if (PROJECT_DOC_BASES.includes(name as ProjectDocBase)) return true;
  for (const base of PROJECT_DOC_BASES) {
    if (!name.startsWith(`${base}-`)) continue;
    const suffix = name.slice(base.length + 1);
    if (suffix && SUFFIX_RE.test(suffix)) return true;
  }
  return false;
}

export interface ProjectDocEntry {
  name: string;
  content: string;
  updatedAt: number;
}

export type ProjectDocsMap = Record<string, string>;

/** Load all director docs for a project (name → content), newest-updated first. */
export async function loadProjectDocs(projectId: string): Promise<ProjectDocEntry[]> {
  if (!projectId) return [];
  try {
    const raw = await kvGet<unknown>(projectDocKey(projectId));
    if (!raw || typeof raw !== 'object') return [];
    const entries: ProjectDocEntry[] = [];
    for (const [name, entry] of Object.entries(raw as Record<string, unknown>)) {
      if (!entry || typeof entry !== 'object') continue;
      const { content, updatedAt } = entry as { content?: unknown; updatedAt?: unknown };
      if (typeof content !== 'string') continue;
      entries.push({
        name,
        content,
        updatedAt: typeof updatedAt === 'number' ? updatedAt : 0,
      });
    }
    return entries.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

/** Overwrite one director doc (rewrite semantics, never append). */
export async function saveProjectDoc(
  projectId: string,
  name: string,
  content: string,
): Promise<boolean> {
  if (!projectId || !isValidProjectDocName(name)) return false;
  try {
    const raw = await kvGet<unknown>(projectDocKey(projectId));
    const map: Record<string, { content: string; updatedAt: number }> =
      raw && typeof raw === 'object' ? (raw as Record<string, { content: string; updatedAt: number }>) : {};
    map[name] = { content, updatedAt: Date.now() };
    await kvSet(projectDocKey(projectId), map);
    return true;
  } catch {
    return false;
  }
}

/** Delete one director doc. Returns true when the doc existed. */
export async function deleteProjectDoc(projectId: string, name: string): Promise<boolean> {
  if (!projectId || !isValidProjectDocName(name)) return false;
  try {
    const raw = await kvGet<unknown>(projectDocKey(projectId));
    if (!raw || typeof raw !== 'object') return false;
    const map = raw as Record<string, unknown>;
    if (!(name in map)) return false;
    delete map[name];
    if (Object.keys(map).length === 0) await kvDel(projectDocKey(projectId));
    else await kvSet(projectDocKey(projectId), map);
    return true;
  } catch {
    return false;
  }
}

/** Remove all director docs for a project (called on project purge). */
export async function purgeProjectDocs(projectId: string): Promise<void> {
  if (!projectId) return;
  try {
    await kvDel(projectDocKey(projectId));
  } catch {
    /* ignore */
  }
}
