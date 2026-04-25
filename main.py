#!/usr/bin/env python3
"""Social media caption generator — CLI entry point.

Usage examples:
  python main.py fitness_creator path/to/video.mp4
  python main.py lifestyle_blogger reel.mov --frames 5
  python main.py --list-clients
"""

import argparse
import sys
from pathlib import Path

from dotenv import load_dotenv

from src.caption_generator import generate_captions
from src.logger import setup_logger
from src.profile_loader import list_profiles

load_dotenv()

STYLE_LABELS = {
    "high_energy": "⚡ HIGH ENERGY",
    "minimalist": "  MINIMALIST",
    "engagement_focused": "💬 ENGAGEMENT-FOCUSED",
}


def print_captions(client_name: str, captions: list[dict]) -> None:
    width = 62
    print(f"\n{'═' * width}")
    print(f"  CAPTION OPTIONS  ›  {client_name.upper()}")
    print(f"{'═' * width}\n")

    for cap in captions:
        style = cap.get("style", "option")
        label = STYLE_LABELS.get(style, style.upper().replace("_", " "))
        caption_text = cap.get("caption", "").strip()
        rationale = cap.get("rationale", "").strip()

        print(f"{'─' * width}")
        print(f"  {label}")
        print(f"{'─' * width}")
        print(caption_text)
        if rationale:
            print(f"\n  ↳ {rationale}")
        print()

    print(f"{'═' * width}\n")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Generate social media captions from a video using AI vision.\n"
            "Swap creator personalities by changing the client name."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "examples:\n"
            "  python main.py fitness_creator workout.mp4\n"
            "  python main.py tech_reviewer unboxing.mov --frames 5\n"
            "  python main.py --list-clients\n"
        ),
    )
    parser.add_argument(
        "client",
        nargs="?",
        help="Client profile name (filename stem inside config/clients/)",
    )
    parser.add_argument(
        "video",
        nargs="?",
        help="Path to the video file (.mp4, .mov, .avi, etc.)",
    )
    parser.add_argument(
        "--frames",
        type=int,
        default=3,
        metavar="N",
        help="Number of frames to extract for vision analysis (default: 3)",
    )
    parser.add_argument(
        "--config-dir",
        default="config/clients",
        metavar="DIR",
        help="Directory containing client JSON profiles (default: config/clients)",
    )
    parser.add_argument(
        "--list-clients",
        action="store_true",
        help="Print all available client profiles and exit",
    )
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    logger = setup_logger()

    if args.list_clients:
        profiles = list_profiles(args.config_dir)
        if profiles:
            print("\nAvailable client profiles:")
            for p in profiles:
                print(f"  {p}")
            print()
        else:
            print(f"No profiles found in '{args.config_dir}'.")
        return

    if not args.client or not args.video:
        parser.print_help()
        sys.exit(1)

    video_path = Path(args.video)
    if not video_path.exists():
        logger.error(f"Video file not found: {args.video}")
        sys.exit(1)

    if args.frames < 1 or args.frames > 10:
        logger.error("--frames must be between 1 and 10.")
        sys.exit(1)

    try:
        captions = generate_captions(
            client_name=args.client,
            video_path=str(video_path),
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

    print_captions(args.client, captions)


if __name__ == "__main__":
    main()
