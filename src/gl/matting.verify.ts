// Runnable verify for the AI-matting three-texture contract:
//   npx tsx src/gl/matting.verify.ts
//
// GlRuntime.renderMatting binds u_input / u_background / u_mask by name (see
// src/gl/runtime.ts). This pins the shader side of that contract so a future
// rename of any sampler fails loudly instead of silently drawing a black or
// fully-transparent matte.
import assert from 'node:assert';
import aiMattingFrag from './fx/ai-matting.frag.ts';
import { isValidMattingMask } from '../../shared/matting.ts';

// The compositor binds exactly these three samplers, in this order.
const samplers = [...aiMattingFrag.matchAll(/uniform\s+sampler2D\s+(\w+)/g)].map((m) => m[1]);
assert.deepStrictEqual(
  samplers,
  ['u_input', 'u_background', 'u_mask'],
  'ai-matting must declare u_input / u_background / u_mask',
);

// u_softness is the edge-feather uniform forwarded through `extra`; it must
// stay declared or the feather becomes a no-op.
assert.ok(/uniform\s+float\s+u_softness/.test(aiMattingFrag), 'ai-matting must declare u_softness');

// MattingMask wire validation gates what renderMatting uploads as u_mask.
assert.strictEqual(isValidMattingMask(null), false, 'null is not a mask');
assert.strictEqual(isValidMattingMask(undefined), false, 'undefined is not a mask');
assert.strictEqual(
  isValidMattingMask({ width: 2, height: 2, alpha: new Uint8Array(4) }),
  true,
  '2x2 mask with 4 alpha bytes is valid',
);
assert.strictEqual(
  isValidMattingMask({ width: 2, height: 2, alpha: new Uint8Array(3) }),
  false,
  'alpha length must equal width*height',
);
assert.strictEqual(
  isValidMattingMask({ width: 0, height: 2, alpha: new Uint8Array(0) }),
  false,
  'zero width is invalid',
);
assert.strictEqual(
  isValidMattingMask({ width: 2, height: 2, alpha: new Uint8ClampedArray(4) as unknown as Uint8Array }),
  false,
  'alpha must be a Uint8Array, not a clamped array',
);

console.log('matting.check: OK');
