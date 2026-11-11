import type { CubeLut } from './fx/cube.js';
import type { TransitionSourceOpacity } from './sourceOpacity.js';
import type { MattingMask } from '../../shared/matting.ts';

export type UniformValue = number | number[];

export interface FxPass {
  frag: string;
  uniforms?: Record<string, UniformValue>;
  /** Read u_input from an earlier pass instead of the immediately previous one. */
  inputFrom?: number;
  /** Bind named sampler uniforms to earlier pass outputs. */
  samplers?: Record<string, number>;
  /** 3D LUT bound to the u_lut sampler3D uniform. */
  lut3d?: CubeLut;
}

export interface GlRuntime {
  canvas: HTMLCanvasElement;
  render: (
    frag: string,
    outgoing: TexImageSource,
    incoming: TexImageSource,
    progress: number,
    extra?: Record<string, UniformValue>,
  ) => void;
  renderTransitionWithFx: (
    frag: string,
    outgoing: TexImageSource,
    incoming: TexImageSource,
    outgoingPasses: FxPass[],
    incomingPasses: FxPass[],
    progress: number,
    extra?: Record<string, UniformValue>,
    sourceOpacity?: TransitionSourceOpacity,
  ) => void;
  renderFx: (
    frag: string,
    input: TexImageSource,
    extra?: Record<string, UniformValue>,
    lut3d?: CubeLut,
  ) => void;
  renderFxChain: (passes: FxPass[], input: TexImageSource) => void;
  /**
   * Three-texture AI matting composite (background replacement). Binds
   * `u_input` (foreground person), `u_background` (replacement) and `u_mask`
   * (per-pixel foreground alpha from the selfie segmenter) to units 0/1/2 and
   * draws the fullscreen quad. The mask is uploaded as a single-channel R8
   * texture so `u_mask.r` is the foreground confidence, matching
   * src/gl/fx/ai-matting.frag. The mask must share the foreground's dimensions
   * (src/matting/segment.ts already resizes it to the source frame).
   */
  renderMatting: (
    frag: string,
    foreground: TexImageSource,
    background: TexImageSource,
    mask: MattingMask,
    extra?: Record<string, UniformValue>,
  ) => void;
  dispose: () => void;
}
