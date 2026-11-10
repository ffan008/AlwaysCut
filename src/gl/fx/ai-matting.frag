#version 300 es
precision highp float;

// AI portrait matting — background replacement (AlwaysCut).
//
// Composites the foreground clip (u_input) over a replacement background
// (u_background) using a per-pixel alpha mask (u_mask) produced by the MediaPipe
// selfie segmenter (src/matting/segment.ts). The mask's red channel is the
// foreground confidence: 1 keeps the foreground, 0 shows the background.
//
// Unlike the pure shader effects (e.g. chroma-key.frag), this shader needs two
// external textures — the replacement background and the per-frame inference
// mask — which the per-clip FxDef registry cannot express today; see the
// feat/matting notes on how those samplers are bound.

uniform sampler2D u_input;      // Foreground clip (the person to keep).
uniform sampler2D u_background; // Replacement background image/video.
uniform sampler2D u_mask;       // Alpha mask; red channel = foreground confidence 0..1.
uniform float u_softness;       // Edge feather width around the 0.5 threshold, 0..0.5.

in vec2 v_texCoord;
out vec4 fragColor;

void main() {
  vec3 foreground = texture(u_input, v_texCoord).rgb;
  vec3 background = texture(u_background, v_texCoord).rgb;

  // Raw foreground confidence from the segmenter mask (already anti-aliased).
  float mask = texture(u_mask, v_texCoord).r;

  // Remap to a controllable matte: a hard 0.5 threshold widened by u_softness,
  // so u_softness=0 gives a binary cutout and larger values feather the edge.
  float alpha = smoothstep(0.5 - u_softness, 0.5 + u_softness, mask);

  // Blend foreground over background; the result is a fully opaque frame.
  vec3 composited = mix(background, foreground, alpha);

  // Premultiplied-alpha convention with opaque output (rgb * 1.0, 1.0).
  fragColor = vec4(composited, 1.0);
}
