#!/usr/bin/env python3
"""Qwen3-TTS local sidecar for AlwaysCut.

Runs the local Qwen3-TTS model (MLX) via mlx_audio and synthesizes a WAV from
text, optionally cloning a reference voice. Two modes:

  1. One-shot (default): spawn once per request by the desktop main process
     (see server/tts-runner.ts). Loads the model, synthesizes one clip, exits.
  2. --serve: load the model ONCE, then loop reading JSON requests from stdin
     (one JSON object per line) and writing JSON results to stdout. This keeps
     the ~3.8 GB model warm in memory so subsequent requests skip the load.

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
from typing import Any, Optional

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


def _resolve_model(model_arg: Optional[str]) -> Optional[str]:
    model = model_arg or _resolve_default_model()
    if not model:
        return None
    if os.path.isdir(model) or os.path.exists(model):
        return model
    if "/" in model:
        return model  # HF repo id; mlx_audio will snapshot_download it.
    return None  # neither a path nor an HF repo id


def _load_tts_model(model: str) -> Any:
    from mlx_audio.tts.utils import load_model

    return load_model(model_path=model)


def _synthesize(
    model: Any,
    text: str,
    ref_audio: Optional[str],
    ref_text: Optional[str],
    output_dir: str,
    prefix: str,
    lang_code: str,
    speed: float,
    max_tokens: Optional[int],
    instruct: Optional[str],
    zero_spk: bool,
    fmt: str = "wav",
) -> list[str]:
    """Run generate_audio with an ALREADY-LOADED model instance (no reload)."""
    from mlx_audio.tts.generate import generate_audio

    os.makedirs(output_dir, exist_ok=True)
    before = set(_find_outputs(output_dir, prefix, fmt))
    generate_audio(
        text=text,
        model=model,  # instance -> generate_audio skips load_model
        ref_audio=ref_audio,
        ref_text=ref_text,
        output_path=output_dir,
        file_prefix=prefix,
        audio_format=fmt,
        speed=speed,
        lang_code=lang_code,
        max_tokens=max_tokens,
        instruct=instruct,
        use_zero_spk_emb=zero_spk,
        verbose=False,
        play=False,
        stream=False,
        join_audio=True,
    )
    after = set(_find_outputs(output_dir, prefix, fmt))
    return [p for p in sorted(after - before) if os.path.getsize(p) > 0]


def _serve(model: Any, output_dir: str) -> int:
    # Signal readiness: the model is loaded and held in memory.
    print(json.dumps({"ready": True}), flush=True)
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
        except Exception:
            print(json.dumps({"error": "invalid request json"}), flush=True)
            continue
        text = (req.get("text") or "").strip()
        if not text:
            print(json.dumps({"error": "text must not be empty"}), flush=True)
            continue
        prefix = str(req.get("prefix") or "tts")
        ref_audio = req.get("ref_audio")
        ref_text = req.get("ref_text")
        if (ref_audio is None) != (ref_text is None):
            print(
                json.dumps(
                    {"error": "ref_audio and ref_text must be provided together"}
                ),
                flush=True,
            )
            continue
        if ref_audio is not None and not os.path.exists(ref_audio):
            print(json.dumps({"error": f"ref_audio not found: {ref_audio}"}), flush=True)
            continue
        # generate_audio prints Text/Voice/Speed/Language regardless of verbose;
        # redirect those logs to stderr so stdout stays a clean JSON stream.
        real_stdout = sys.stdout
        sys.stdout = sys.stderr
        try:
            produced = _synthesize(
                model,
                text,
                ref_audio,
                ref_text,
                output_dir,
                prefix,
                req.get("lang_code") or "zh",
                req.get("speed") or 1.0,
                req.get("max_tokens"),
                req.get("instruct"),
                bool(req.get("zero_spk")),
                "wav",
            )
        except Exception as exc:
            print(json.dumps({"error": f"synthesis failed: {exc}"}), flush=True)
            continue
        finally:
            sys.stdout = real_stdout
        if not produced:
            print(
                json.dumps({"error": "synthesis produced no output file"}), flush=True
            )
            continue
        print(json.dumps({"files": produced, "format": "wav"}, ensure_ascii=False), flush=True)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Qwen3-TTS local synthesis sidecar")
    parser.add_argument("--text", default=None, help="Text to synthesize (one-shot only)")
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
    parser.add_argument("--serve", action="store_true", help="Load model once and serve JSON requests on stdin")
    args = parser.parse_args()

    if not args.serve:
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

    model = _resolve_model(args.model)
    if not model:
        print(
            f"error: no model available. Provide --model or download {DEFAULT_REPO}.",
            file=sys.stderr,
        )
        return 2

    output_dir = args.output_dir or os.path.join(os.getcwd(), "tts-out")
    os.makedirs(output_dir, exist_ok=True)

    # Import lazily so --help / validation never pay the (large) mlx import cost.
    try:
        loaded = _load_tts_model(model)
    except Exception as exc:  # pragma: no cover - environment issue
        print(f"error: failed to load model: {exc}", file=sys.stderr)
        return 1

    if args.serve:
        return _serve(loaded, output_dir)

    # One-shot: synthesize a single clip from the command line.
    try:
        produced = _synthesize(
            loaded,
            (args.text or "").strip(),
            args.ref_audio,
            args.ref_text,
            output_dir,
            args.prefix,
            args.lang_code,
            args.speed,
            args.max_tokens,
            args.instruct,
            args.zero_spk,
            "wav",
        )
    except Exception as exc:
        print(f"error: synthesis raised: {exc}", file=sys.stderr)
        return 1

    if not produced:
        print(
            "error: synthesis produced no output file (see logs above for the "
            "underlying model error).",
            file=sys.stderr,
        )
        return 1

    print(json.dumps({"files": produced, "model": model, "format": "wav"}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
