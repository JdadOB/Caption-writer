import json
from pathlib import Path

REQUIRED_FIELDS = [
    "name",
    "tone",
    "target_audience",
    "emoji_preferences",
    "banned_words",
    "best_past_content",
]


def load_profile(client_name: str, config_dir: str = "config/clients") -> dict:
    """Load and validate a client personality profile from a JSON file.

    Args:
        client_name: The profile filename stem (e.g. 'fitness_creator').
        config_dir:  Directory containing client JSON files.

    Returns:
        The parsed profile dict.

    Raises:
        FileNotFoundError: If no matching profile exists.
        ValueError: If the profile is missing required fields.
    """
    profile_path = Path(config_dir) / f"{client_name}.json"

    if not profile_path.exists():
        available = sorted(p.stem for p in Path(config_dir).glob("*.json"))
        raise FileNotFoundError(
            f"Profile '{client_name}' not found in '{config_dir}'. "
            f"Available profiles: {available}"
        )

    with open(profile_path, encoding="utf-8") as f:
        profile = json.load(f)

    missing = [field for field in REQUIRED_FIELDS if field not in profile]
    if missing:
        raise ValueError(
            f"Profile '{client_name}' is missing required fields: {missing}"
        )

    return profile


def list_profiles(config_dir: str = "config/clients") -> list[str]:
    """Return the stems of all JSON profiles found in config_dir."""
    return sorted(p.stem for p in Path(config_dir).glob("*.json"))
