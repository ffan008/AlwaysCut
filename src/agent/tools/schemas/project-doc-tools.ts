import type { AgentToolSchema } from '../../tool-schema';

// Director "project memory" tools: the Pro 6-doc model (brief / treatment /
// progress / analysis / timeline / objects) persisted per project across
// sessions. These are the agent's long-term working memory — "rewrite, not
// append", reference truth separate from goal truth, progress is a handoff
// note not a history log.

export const PROJECT_DOC_TOOL_SCHEMAS: AgentToolSchema[] = [
  {
    name: 'read_project_doc',
    description: [
      'Read the director project-memory documents for the current project.',
      'Call with NO arguments to list every doc (name + updatedAt + content length); pass name to read one doc in full.',
      'Names follow the six bases (brief/treatment/progress/analysis/timeline/objects) plus suffixed variants like analysis-<slug> or brief-<slug>.',
      'When taking over any already-started project, call this first (no args) to see what exists, then read progress and brief before acting.',
    ].join(' '),
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Doc name to read in full; omit to list all docs.' },
        projectId: { type: 'string', description: 'Defaults to the current project.' },
      },
    },
  },
  {
    name: 'write_project_doc',
    description: [
      'Overwrite one director project-memory document (rewrite semantics, never append — a doc is the current truth, not a log).',
      'brief = what the user said that counts (goal/audience/constraints/budget); treatment = your creative answer (intent, not parameter values);',
      'progress = the present snapshot (current problem, next step, blockers, in-flight exports) — write before stopping mid-task or switching sessions, clear it to a one-liner once delivered;',
      'analysis/timeline/objects = reference truth about a source film (why it works, its objects over time, the object→asset map).',
      'Keep reference truth (what the source DID) separate from goal truth (what the new film SHOULD do).',
    ].join(' '),
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'One of brief/treatment/progress/analysis/timeline/objects, or a suffixed variant like analysis-<slug>.' },
        content: { type: 'string', description: 'Full new content (replaces the old content entirely).' },
        projectId: { type: 'string', description: 'Defaults to the current project.' },
      },
      required: ['name', 'content'],
    },
  },
];

export const PROJECT_DOC_TOOL_NAMES = new Set(PROJECT_DOC_TOOL_SCHEMAS.map((t) => t.name));
