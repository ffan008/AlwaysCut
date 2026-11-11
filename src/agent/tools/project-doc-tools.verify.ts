// Runnable: `npx tsx src/agent/tools/project-doc-tools.verify.ts`
import assert from 'node:assert';
import { resetProjectStoreMemory } from '../../persist/projectStore';
import { isValidProjectDocName } from '../../persist/projectDocs';
import type { AgentContext } from '../context';
import { PROJECT_DOC_TOOL_NAMES, PROJECT_DOC_TOOL_SCHEMAS } from './schemas/project-doc-tools';
import { execProjectDocTool } from './project-doc-tools';

const expected = ['read_project_doc', 'write_project_doc'].sort();
assert.deepStrictEqual(PROJECT_DOC_TOOL_SCHEMAS.map((t) => t.name).sort(), expected);
for (const n of expected) assert.ok(PROJECT_DOC_TOOL_NAMES.has(n));

// Doc-name validation: six bases + suffixed variants; nothing else.
for (const base of ['brief', 'treatment', 'progress', 'analysis', 'timeline', 'objects']) {
  assert.ok(isValidProjectDocName(base), `base ${base} valid`);
}
assert.ok(isValidProjectDocName('analysis-competitor-a'));
assert.ok(isValidProjectDocName('timeline-ref2'));
assert.ok(isValidProjectDocName('brief-en'));
assert.ok(!isValidProjectDocName('random'));
assert.ok(!isValidProjectDocName('brief-UPPER'));
assert.ok(!isValidProjectDocName('brief_'));
assert.ok(!isValidProjectDocName(''));
assert.ok(!isValidProjectDocName('brief-'));
assert.ok(!isValidProjectDocName('analysis-'));

resetProjectStoreMemory();

const projectId = 'proj-doc-test';
const ctx = { getProjectId: () => projectId } as unknown as AgentContext;

// Empty list.
const list0 = await execProjectDocTool('read_project_doc', {}, ctx) as { count: number };
assert.strictEqual(list0.count, 0);

// Write brief.
const w1 = await execProjectDocTool('write_project_doc', { name: 'brief', content: '目标：做一条口播' }, ctx) as { ok?: boolean };
assert.strictEqual(w1.ok, true);

// Read brief back.
const r1 = await execProjectDocTool('read_project_doc', { name: 'brief' }, ctx) as { content?: string };
assert.strictEqual(r1.content, '目标：做一条口播');

// Rewrite (never append).
await execProjectDocTool('write_project_doc', { name: 'brief', content: '目标：改成竖屏 9:16' }, ctx);
const r2 = await execProjectDocTool('read_project_doc', { name: 'brief' }, ctx) as { content?: string };
assert.strictEqual(r2.content, '目标：改成竖屏 9:16');

// List shows exactly one doc.
const list1 = await execProjectDocTool('read_project_doc', {}, ctx) as { count: number; docs: { name: string }[] };
assert.strictEqual(list1.count, 1);
assert.strictEqual(list1.docs[0]!.name, 'brief');

// Read a missing (but valid) doc → exists:false.
const missing = await execProjectDocTool('read_project_doc', { name: 'treatment' }, ctx) as { exists?: boolean };
assert.strictEqual(missing.exists, false);

// Invalid name write → error.
const bad = await execProjectDocTool('write_project_doc', { name: 'random', content: 'x' }, ctx) as { error?: string };
assert.ok(bad.error, 'invalid name errors');

// Empty content write → error.
const noContent = await execProjectDocTool('write_project_doc', { name: 'brief', content: '' }, ctx) as { error?: string };
assert.ok(noContent.error, 'empty content errors');

// Invalid name read → error.
const badRead = await execProjectDocTool('read_project_doc', { name: 'nope' }, ctx) as { error?: string };
assert.ok(badRead.error, 'invalid read name errors');

// No project targeted → error.
const noProj = await execProjectDocTool('read_project_doc', {}, { getProjectId: () => null } as unknown as AgentContext) as { error?: string };
assert.ok(noProj.error, 'missing project errors');

console.log('project-doc-tools.verify: ok');
