#version 300 es
precision highp float;

// AI portrait matting — transparent cutout (AlwaysCut).
//
// Multiplies the foreground clip (u_input) by a per-pixel alpha mask (u_mask)
// produced by the MediaPipe selfie segmenter (src/matting/segment.ts), emitting
// a TRANSPARENT foreground (rgb kept, alpha = mask) so the timeline layers
// below it show through as the replacement background — the same convention as
// chroma-key/luma-key. The mask's red channel is the foreground confidence:
// 1 keeps the foreground, 0 makes it transparent.
//
// The per-frame mask is bound by GlRuntime.renderMatting (units 0/1); the
// per-clip FxDef registry cannot express a mask input, so ClipFx routes the
// builtin:fx-ai-matting entry through this dedicated path.

uniform sampler2D u_input; // Foreground clip (the person to keep).
uniform sampler2D u_mask;  // Alpha mask; red channel = foreground confidence 0..1.
uniform float u_softness;  // Edge feather width around the 0.5 threshold, 0..0.5.

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
  vec4 foreground = texture(u_input, v_texCoord);

  // Raw foreground confidence from the segmenter mask (already anti-aliased).
  float mask = texture(u_mask, v_texCoord).r;

  // Remap to a controllable matte: a hard 0.5 threshold widened by u_softness,
  // so u_softness=0 gives a binary cutout and larger values feather the edge.
  float alpha = smoothstep(0.5 - u_softness, 0.5 + u_softness, mask);

  // Transparent foreground: keep the person, drop the background. The result
  // composites over whatever the lower timeline tracks show.
  fragColor = vec4(foreground.rgb, foreground.a * alpha);
}
