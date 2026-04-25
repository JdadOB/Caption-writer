#!/usr/bin/env python3
"""Quick end-to-end test launcher.

Creates a synthetic video (coloured frames with text), runs it through the
caption generator with a chosen client profile, then cleans up.

Usage:
  python test_run.py                        # uses fitness_creator, 3 frames
  python test_run.py lifestyle_blogger      # different profile
  python test_run.py tech_reviewer --frames 5
"""

import argparse
import sys
import tempfile
from pathlib import Path

import cv2
import numpy as np
from dotenv import load_dotenv

load_dotenv()

# Colour palette for the synthetic frames (BGR)
FRAME_COLOURS = [
    (45, 105, 255),   # vivid blue
    (30, 200, 80),    # green
    (0, 140, 255),    # orange
    (180, 60, 220),   # purple
    (20, 220, 220),   # yellow
]

LABELS = [
    "WORKOUT CLIP",
    "NEW GEAR DROP",
    "MORNING ROUTINE",
    "TECHNIQUE DEMO",
    "PROGRESS CHECK",
]


def make_test_video(path: str, num_frames: int = 9, fps: int = 3) -> None:
    """Write a short synthetic video so the extractor has something to read."""
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(path, fourcc, fps, (640, 360))

    for i in range(num_frames):
        colour = FRAME_COLOURS[i % len(FRAME_COLOURS)]
        frame = np.full((360, 640, 3), colour, dtype=np.uint8)

        # Gradient overlay so it doesn't look completely flat
        for y in range(360):
            alpha = y / 360 * 0.4
            frame[y] = (frame[y] * (1 - alpha)).astype(np.uint8)

        label = LABELS[i % len(LABELS)]
        cv2.putText(
            frame, label, (60, 200),
            cv2.FONT_HERSHEY_DUPLEX, 1.8,
            (255, 255, 255), 3, cv2.LINE_AA,
        )
        cv2.putText(
            frame, f"frame {i + 1}/{num_frames}", (20, 340),
            cv2.FONT_HERSHEY_SIMPLEX, 0.7,
            (200, 200, 200), 1, cv2.LINE_AA,
        )
        writer.write(frame)

    writer.release()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Generate captions from a synthetic test video.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "examples:\n"
            "  python test_run.py\n"
            "  python test_run.py lifestyle_blogger\n"
            "  python test_run.py tech_reviewer --frames 5\n"
        ),
    )
    parser.add_argument(
        "client",
        nargs="?",
        default="fitness_creator",
        help="Client profile name (default: fitness_creator)",
    )
    parser.add_argument(
        "--frames",
        type=int,
        default=3,
        metavar="N",
        help="Frames to extract for vision analysis (default: 3)",
    )
    parser.add_argument(
        "--config-dir",
        default="config/clients",
        metavar="DIR",
        help="Directory containing client JSON profiles (default: config/clients)",
    )
    parser.add_argument(
        "--keep-video",
        action="store_true",
        help="Don't delete the synthetic video after the run",
    )
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    # Validate frame count before doing any work
    if args.frames < 1 or args.frames > 10:
        print("Error: --frames must be between 1 and 10.", file=sys.stderr)
        sys.exit(1)

    # Lazy import so a missing ANTHROPIC_API_KEY surfaces as a clear error
    from src.caption_generator import generate_captions
    from src.logger import setup_logger

    logger = setup_logger()

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        video_path = tmp.name

    try:
        print(f"\nBuilding synthetic test video → {video_path}")
        make_test_video(video_path, num_frames=max(9, args.frames * 3))
        print(f"Running caption generator  › client='{args.client}', frames={args.frames}\n")

        captions = generate_captions(
            client_name=args.client,
            video_path=video_path,
            num_frames=args.frames,
            config_dir=args.config_dir,
        )
    except FileNotFoundError as exc:
        logger.error(str(exc))
        sys.exit(1)
    except ValueError as exc:
        logger.error(f"Caption generation error: {exc}")
        sys.exit(1)
    except Exception as exc:
        logger.error(f"Unexpected error: {exc}", exc_info=True)
        sys.exit(1)
    finally:
        if not args.keep_video:
            Path(video_path).unlink(missing_ok=True)
        else:
            print(f"Synthetic video kept at: {video_path}")

    # Reuse main.py's pretty-printer
    from main import print_captions
    print_captions(args.client, captions)


if __name__ == "__main__":
    main()
