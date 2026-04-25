"""Core caption generation logic using the Anthropic vision API."""

import json

import anthropic
from dotenv import load_dotenv

from .frame_extractor import extract_frames
from .logger import log_api_response, setup_logger
from .profile_loader import load_profile

load_dotenv()

MODEL = "claude-opus-4-7"

# Each caption style gives the model a distinct creative brief.
CAPTION_STYLES = {
    "high_energy": (
        "High-energy and punchy — maximum impact in minimum words. "
        "Bold statements, short punchy sentences, strong call-to-action."
    ),
    "minimalist": (
        "Stripped back and confident — let silence do the work. "
        "One or two sentences max, no hashtags unless they feel essential, "
        "trusts the viewer to fill in the gaps."
    ),
    "engagement_focused": (
        "Designed to spark conversation — asks a question or makes a "
        "provocative statement that invites replies and shares."
    ),
}


def _build_system_prompt(profile: dict) -> str:
    banned = ", ".join(profile.get("banned_words", [])) or "none"
    emoji_prefs = profile["emoji_preferences"]
    use_emojis = emoji_prefs.get("use_emojis", True)
    preferred_emojis = " ".join(emoji_prefs.get("preferred", []))
    avoid_emojis = " ".join(emoji_prefs.get("avoid", []))

    examples_block = ""
    for ex in profile.get("best_past_content", [])[:3]:
        examples_block += (
            f"\nContext: {ex.get('context', 'N/A')}\n"
            f"Caption:\n{ex.get('caption', '')}\n"
        )

    return f"""You are a social media caption writer for {profile['name']} ({profile.get('handle', '')}).

CREATOR PROFILE
───────────────
Tone:            {profile['tone']}
Target audience: {profile['target_audience']}
Platform:        {profile.get('platform', 'Instagram')}
Caption length:  {profile.get('caption_length', '50-150 words')}
Hashtag style:   {profile.get('hashtag_style', '3-5 relevant hashtags')}
Use emojis:      {use_emojis}
Preferred emojis:{preferred_emojis or ' none specified'}
Avoid emojis:    {avoid_emojis or ' none'}

BANNED WORDS — never use any of these: {banned}

EXAMPLES OF THEIR BEST-PERFORMING CONTENT
──────────────────────────────────────────{examples_block}
INSTRUCTIONS
────────────
Analyse the provided video frames carefully. Write exactly 3 caption options.
Each must reflect a different creative angle while staying true to this creator's
voice, audience, and visual identity. Banned words are absolute — violating them
is not permitted under any circumstances."""


def _build_user_message(frames_b64: list[str]) -> list[dict]:
    style_descriptions = "\n".join(
        f'  "{style}": {desc}' for style, desc in CAPTION_STYLES.items()
    )

    image_blocks = [
        {
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": "image/jpeg",
                "data": frame,
            },
        }
        for frame in frames_b64
    ]

    instruction_block = {
        "type": "text",
        "text": (
            f"Here are {len(frames_b64)} frame(s) from the video.\n\n"
            "Write exactly 3 captions, one per style below:\n"
            f"{style_descriptions}\n\n"
            "Return ONLY a JSON object with this exact structure — no markdown fences, "
            "no preamble:\n"
            "{\n"
            '  "captions": [\n'
            '    {\n'
            '      "style": "high_energy",\n'
            '      "caption": "...",\n'
            '      "rationale": "one sentence explaining the creative choice"\n'
            '    },\n'
            '    {\n'
            '      "style": "minimalist",\n'
            '      "caption": "...",\n'
            '      "rationale": "one sentence explaining the creative choice"\n'
            '    },\n'
            '    {\n'
            '      "style": "engagement_focused",\n'
            '      "caption": "...",\n'
            '      "rationale": "one sentence explaining the creative choice"\n'
            '    }\n'
            '  ]\n'
            "}\n\n"
            "Each caption must:\n"
            "• Match the creator's voice and tone exactly as shown in the profile examples\n"
            "• Never use any banned words\n"
            "• Respect the emoji preferences (use/avoid as specified)\n"
            "• Include hashtags in the style specified by the profile\n"
            "• Be tailored specifically to the content visible in these frames\n"
        ),
    }

    return image_blocks + [instruction_block]


def _parse_captions(raw_text: str) -> list[dict]:
    """Extract the JSON captions array from the API response text."""
    text = raw_text.strip()

    # Strip markdown code fences if the model added them despite instructions
    if text.startswith("```"):
        lines = text.splitlines()
        end = next((i for i, l in enumerate(lines[1:], 1) if l.strip() == "```"), None)
        text = "\n".join(lines[1:end] if end else lines[1:])

    result = json.loads(text)
    return result.get("captions", [])


def _call_api(
    profile: dict,
    frames_b64: list[str],
    client_name: str,
    logger,
) -> list[dict]:
    """Build prompts, call the Anthropic API, parse and return captions."""
    system_prompt = _build_system_prompt(profile)
    user_content  = _build_user_message(frames_b64)
    api_client    = anthropic.Anthropic()

    logger.info(f"Sending request to {MODEL} ...")

    with api_client.messages.stream(
        model=MODEL,
        max_tokens=2048,
        thinking={"type": "adaptive"},
        system=[
            {
                "type": "text",
                "text": system_prompt,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": user_content}],
    ) as stream:
        response = stream.get_final_message()

    log_api_response(logger, client_name, response)

    raw_text = next(
        (block.text for block in response.content if block.type == "text"), ""
    )

    try:
        captions = _parse_captions(raw_text)
    except (json.JSONDecodeError, KeyError) as exc:
        logger.error(f"Failed to parse API response as JSON: {exc}")
        logger.debug(f"Raw response text (first 800 chars): {raw_text[:800]}")
        raise ValueError(f"API returned unexpected format: {exc}") from exc

    if len(captions) != 3:
        logger.warning(
            f"Expected 3 captions but received {len(captions)} — "
            "the model may not have followed the format exactly."
        )

    logger.info(f"Caption generation complete | {len(captions)} option(s) returned")
    return captions


def generate_captions(
    client_name: str,
    video_path: str,
    num_frames: int = 3,
    config_dir: str = "config/clients",
) -> list[dict]:
    """Generate exactly three caption options for a video using a named client profile.

    Args:
        client_name: Stem of the profile JSON file (e.g. 'fitness_creator').
        video_path:  Path to the source video file.
        num_frames:  Number of frames to extract and send for vision analysis.
        config_dir:  Directory containing client JSON profiles.

    Returns:
        A list of 3 dicts, each with keys: 'style', 'caption', 'rationale'.

    Raises:
        FileNotFoundError: If the video or client profile cannot be found.
        ValueError: If frame extraction or JSON parsing fails.
    """
    logger = setup_logger()
    logger.info(
        f"Starting caption generation | client='{client_name}' | video='{video_path}'"
    )
    profile = load_profile(client_name, config_dir)
    logger.info(f"Loaded profile for '{profile['name']}' ({profile.get('handle', '')})")
    frames_b64 = extract_frames(video_path, num_frames)
    logger.info(f"Extracted {len(frames_b64)} frame(s) from '{video_path}'")
    return _call_api(profile, frames_b64, client_name, logger)


def generate_captions_from_frames(
    client_name: str,
    frames_b64: list[str],
    config_dir: str = "config/clients",
) -> list[dict]:
    """Generate exactly three caption options from pre-extracted base64 frames.

    Used by the web dashboard where frame extraction happens before this call.

    Args:
        client_name: Stem of the profile JSON file (e.g. 'fitness_creator').
        frames_b64:  List of base64-encoded JPEG strings.
        config_dir:  Directory containing client JSON profiles.

    Returns:
        A list of 3 dicts, each with keys: 'style', 'caption', 'rationale'.
    """
    logger = setup_logger()
    logger.info(
        f"Starting caption generation | client='{client_name}' | frames={len(frames_b64)}"
    )
    profile = load_profile(client_name, config_dir)
    logger.info(f"Loaded profile for '{profile['name']}' ({profile.get('handle', '')})")
    return _call_api(profile, frames_b64, client_name, logger)
