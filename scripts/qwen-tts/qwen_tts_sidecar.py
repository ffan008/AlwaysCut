#!/usr/bin/env python3
"""Qwen3-TTS local sidecar for AlwaysCut.

Runs the local Qwen3-TTS model (MLX) via mlx_audio and synthesizes a WAV from
text, optionally cloning a reference voice. Designed to be spawned once per
request by the desktop main process (see server/tts-runner.ts).

The model is resolved in this order:
  1. --model (a local directory or a HuggingFace repo id) if provided;
  2. a local snapshot of mlx-community/Qwen3-TTS-12Hz-1.7B-Base-bf16 found in
     the HuggingFace cache (no download).

Exit codes:
  0  success (a JSON object is printed to stdout)
  2  usage / validation error
  1  any synthesis failure
"""
from __future__ import annotations

import argparse
import glob
import json
import os
import sys
from pathlib import Path
from typing import Optional

# Force stdout/stderr to UTF-8 so Chinese text and logs never crash the pipe.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

DEFAULT_REPO = "mlx-community/Qwen3-TTS-12Hz-1.7B-Base-bf16"


def _resolve_default_model() -> Optional[str]:
    """Locate the local HF snapshot for the default repo, if downloaded."""
    cache_root = os.environ.get(
        "HF_HOME", os.path.join(str(Path.home()), ".cache", "huggingface")
    )
    repo_dir = os.path.join(cache_root, "hub", f"models--{DEFAULT_REPO.replace('/', '--')}")
    snapshots = glob.glob(os.path.join(repo_dir, "snapshots", "*"))
    # Prefer a snapshot that actually has the model weights.
    for snap in sorted(snapshots, reverse=True):
        if os.path.exists(os.path.join(snap, "model.safetensors")) or os.path.exists(
            os.path.join(snap, "model.safetensors.index.json")
        ):
            return snap
    return None


def _find_outputs(output_dir: str, prefix: str, fmt: str) -> list[str]:
    # join_audio writes a single `{prefix}.wav`; a non-joined run writes
    # per-segment `{prefix}_000.wav` files. Match both shapes.
    exact = os.path.join(output_dir, f"{prefix}.{fmt}")
    segmented = os.path.join(output_dir, f"{prefix}_*.{fmt}")
    return sorted(glob.glob(exact) + glob.glob(segmented))


def main() -> int:
    parser = argparse.ArgumentParser(description="Qwen3-TTS local synthesis sidecar")
    parser.add_argument("--text", required=True, help="Text to synthesize")
    parser.add_argument("--model", default=None, help="Local model dir or HF repo id")
    parser.add_argument("--ref_audio", default=None, help="Reference audio path for voice cloning")
    parser.add_argument("--ref_text", default=None, help="Transcript of the reference audio")
    parser.add_argument("--output_dir", default=None, help="Directory to write WAV into")
    parser.add_argument("--prefix", default="tts", help="Output file prefix")
    parser.add_argument("--lang_code", default="zh", help="Language code (default zh)")
    parser.add_argument("--speed", type=float, default=1.0, help="Speed multiplier")
    parser.add_argument("--max_tokens", type=int, default=None, help="Max speech tokens")
    parser.add_argument("--instruct", default=None, help="Style/emotion instruction")
    parser.add_argument("--zero_spk", action="store_true", help="Use zero speaker embedding (no cloning)")
    args = parser.parse_args()

    text = (args.text or "").strip()
    if not text:
        print("error: --text must not be empty", file=sys.stderr)
        return 2
    if (args.ref_audio is None) != (args.ref_text is None):
        print(
            "error: --ref_audio and --ref_text must be provided together (the "
            "sidecar never auto-transcribes, to avoid surprise downloads).",
            file=sys.stderr,
        )
        return 2
    if args.ref_audio is not None and not os.path.exists(args.ref_audio):
        print(f"error: --ref_audio not found: {args.ref_audio}", file=sys.stderr)
        return 2

    model = args.model or _resolve_default_model()
    if not model:
        print(
            f"error: no model available. Provide --model or download {DEFAULT_REPO}.",
            file=sys.stderr,
        )
        return 2
    if os.path.isdir(model) or os.path.exists(model):
        pass
    elif "/" in model:
        pass  # HF repo id; mlx_audio will snapshot_download it.
    else:
        print(f"error: --model is neither a path nor an HF repo id: {model}", file=sys.stderr)
        return 2

    output_dir = args.output_dir or os.path.join(os.getcwd(), "tts-out")
    os.makedirs(output_dir, exist_ok=True)
    fmt = "wav"

    # Import lazily so --help / validation never pay the (large) mlx import cost.
    try:
        from mlx_audio.tts.generate import generate_audio
    except Exception as exc:  # pragma: no cover - environment issue
        print(f"error: failed to import mlx_audio: {exc}", file=sys.stderr)
        return 1

    # generate_audio swallows exceptions internally, so detect failure by
    # whether any output file actually appeared.
    before = set(_find_outputs(output_dir, args.prefix, fmt))
    try:
        generate_audio(
            text=text,
            model=model,
            ref_audio=args.ref_audio,
            ref_text=args.ref_text,
            output_path=output_dir,
            file_prefix=args.prefix,
            audio_format=fmt,
            speed=args.speed,
            lang_code=args.lang_code,
            max_tokens=args.max_tokens,
            instruct=args.instruct,
            use_zero_spk_emb=args.zero_spk,
            verbose=False,
            play=False,
            stream=False,
            join_audio=True,
        )
    except Exception as exc:
        print(f"error: synthesis raised: {exc}", file=sys.stderr)
        return 1

    after = set(_find_outputs(output_dir, args.prefix, fmt))
    produced = [p for p in sorted(after - before) if os.path.getsize(p) > 0]
    if not produced:
        print(
            "error: synthesis produced no output file (see logs above for the "
            "underlying model error).",
            file=sys.stderr,
        )
        return 1

    print(json.dumps({"files": produced, "model": model, "format": fmt}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
