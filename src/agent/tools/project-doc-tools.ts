import type { AgentContext } from '../context';
import {
  deleteProjectDoc,
  isValidProjectDocName,
  loadProjectDocs,
  PROJECT_DOC_BASES,
  saveProjectDoc,
} from '../../persist/projectDocs';

// Director "project memory" tool executor. Operates on the current project
// (ctx.getProjectId()) unless an explicit projectId is passed.

type Args = Record<string, unknown>;

function currentProjectId(ctx: AgentContext): string | null {
  return ctx.getProjectId?.() ?? null;
}

function resolveProjectId(args: Args, ctx: AgentContext): string | null {
  const explicit = typeof args.projectId === 'string' && args.projectId.trim()
    ? args.projectId.trim()
    : '';
  return explicit || currentProjectId(ctx);
}

const MAX_CONTENT_PREVIEW = 120;

function preview(content: string): string {
  const singleLine = content.replace(/\s+/g, ' ').trim();
  return singleLine.length > MAX_CONTENT_PREVIEW
    ? `${singleLine.slice(0, MAX_CONTENT_PREVIEW)}…`
    : singleLine;
}

export async function execProjectDocTool(name: string, args: Args, ctx: AgentContext): Promise<unknown> {
  switch (name) {
    case 'read_project_doc':
      return execRead(args, ctx);
    case 'write_project_doc':
      return execWrite(args, ctx);
    default:
      return { error: `unknown tool ${name}` };
  }
}

async function execRead(args: Args, ctx: AgentContext): Promise<unknown> {
  const projectId = resolveProjectId(args, ctx);
  if (!projectId) return { error: 'no project targeted — open a project first or pass projectId' };

  const docs = await loadProjectDocs(projectId);
  const requested = typeof args.name === 'string' && args.name.trim() ? args.name.trim() : '';

  if (requested) {
    if (!isValidProjectDocName(requested)) {
      return {
        error: `unknown doc name "${requested}"`,
        validNames: [...PROJECT_DOC_BASES, 'and suffixed variants like analysis-<slug>'],
      };
    }
    const found = docs.find((d) => d.name === requested);
    if (!found) return { ok: true, projectId, name: requested, exists: false };
    return { ok: true, projectId, name: found.name, updatedAt: found.updatedAt, content: found.content };
  }

  // List mode: no args → enumerate every doc.
  const list = docs.map((d) => ({
    name: d.name,
    updatedAt: d.updatedAt,
    contentLength: d.content.length,
    preview: preview(d.content),
  }));
  return {
    ok: true,
    projectId,
    count: list.length,
    docs: list,
    note: list.length
      ? 'Call read_project_doc {name} to read one in full.'
      : 'No project docs yet. write_project_doc to create brief/treatment/…',
  };
}

async function execWrite(args: Args, ctx: AgentContext): Promise<unknown> {
  const projectId = resolveProjectId(args, ctx);
  if (!projectId) return { error: 'no project targeted — open a project first or pass projectId' };

  const name = typeof args.name === 'string' ? args.name.trim() : '';
  const content = typeof args.content === 'string' ? args.content : '';

  if (!name) return { error: 'name is required (brief/treatment/progress/analysis/timeline/objects or -<slug> variant)' };
  if (!isValidProjectDocName(name)) {
    return {
      error: `invalid doc name "${name}"`,
      validNames: [...PROJECT_DOC_BASES, 'and suffixed variants like analysis-<slug>'],
    };
  }
  if (!content) return { error: 'content is required (write the full new content; it replaces the old entirely)' };

  const saved = await saveProjectDoc(projectId, name, content);
  if (!saved) return { error: 'write failed (project store unavailable)' };

  return {
    ok: true,
    projectId,
    name,
    contentLength: content.length,
    note: `"${name}" overwritten. It is the current truth — not an appended log.`,
  };
}

/** Exposed for tests only. */
export async function _deleteProjectDocForTest(projectId: string, name: string): Promise<boolean> {
  return deleteProjectDoc(projectId, name);
}
