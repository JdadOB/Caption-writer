#!/usr/bin/env python3
"""Caption Writer — Streamlit web dashboard."""

import base64
import html
import json
import os
import tempfile
from pathlib import Path

import cv2
import numpy as np
import streamlit as st
from dotenv import load_dotenv

load_dotenv()

# On Streamlit Cloud secrets live in st.secrets, not env vars
if "ANTHROPIC_API_KEY" in st.secrets:
    os.environ["ANTHROPIC_API_KEY"] = str(st.secrets["ANTHROPIC_API_KEY"]).strip()

CONFIG_DIR = "config/clients"

st.set_page_config(
    page_title="Caption Writer",
    layout="wide",
    initial_sidebar_state="expanded",
    menu_items={"Get Help": None, "Report a bug": None, "About": None},
)

st.markdown("""
<style>
#MainMenu, footer, header { visibility: hidden; }
.block-container { padding-top: 1.5rem; padding-bottom: 2rem; max-width: 1200px; }

.caption-card {
    background: #141414;
    border: 1px solid #1e1e1e;
    border-radius: 8px;
    padding: 1.5rem;
    min-height: 320px;
    display: flex;
    flex-direction: column;
}
.cc-label {
    font-size: 0.6rem;
    letter-spacing: 0.2em;
    font-weight: 700;
    text-transform: uppercase;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid #222;
    margin-bottom: 1rem;
}
.cc-energy  { color: #ff7043; }
.cc-minimal { color: #90a4ae; }
.cc-engage  { color: #42a5f5; }
.cc-text {
    font-size: 0.9rem;
    line-height: 1.8;
    color: #d8d8d8;
    white-space: pre-wrap;
    flex: 1;
}
.cc-rationale {
    font-size: 0.72rem;
    color: #505050;
    font-style: italic;
    padding-top: 0.75rem;
    border-top: 1px solid #1a1a1a;
    margin-top: 1rem;
}
.profile-pill {
    background: #111;
    border: 1px solid #1e1e1e;
    border-radius: 6px;
    padding: 0.85rem 1rem;
    margin-top: 0.4rem;
}
.pp-name   { font-weight: 600; font-size: 0.9rem; color: #e0e0e0; }
.pp-handle { color: #c4a55a; font-size: 0.78rem; margin: 3px 0 7px; }
.pp-meta   { color: #555; font-size: 0.72rem; line-height: 1.65; }
</style>
""", unsafe_allow_html=True)


# ── Utilities ─────────────────────────────────────────────────────────────────

def list_clients() -> list[str]:
    return sorted(p.stem for p in Path(CONFIG_DIR).glob("*.json"))


def read_profile(name: str) -> dict:
    with open(Path(CONFIG_DIR) / f"{name}.json", encoding="utf-8") as f:
        return json.load(f)


def write_profile(name: str, data: dict) -> None:
    path = Path(CONFIG_DIR) / f"{name}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def upload_to_frames(uploaded_file, num_frames: int) -> list[str]:
    """Convert a Streamlit upload (video or image) into base64 JPEG frames."""
    mime = uploaded_file.type or ""
    raw  = uploaded_file.getvalue()

    if mime.startswith("image/"):
        arr = np.frombuffer(raw, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode the image file.")
        _, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 85])
        return [base64.standard_b64encode(buf.tobytes()).decode()]

    suffix = Path(uploaded_file.name).suffix or ".mp4"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(raw)
        path = tmp.name
    try:
        from src.frame_extractor import extract_frames
        return extract_frames(path, num_frames)
    finally:
        os.unlink(path)


def caption_card_html(cap: dict) -> str:
    style = cap.get("style", "")
    info = {
        "high_energy":        ("⚡  HIGH ENERGY", "cc-energy"),
        "minimalist":         ("◻   MINIMALIST",  "cc-minimal"),
        "engagement_focused": ("💬  ENGAGEMENT",  "cc-engage"),
    }
    label, cls = info.get(style, (style.upper().replace("_", " "), ""))
    text      = html.escape(cap.get("caption",   "").strip())
    rationale = html.escape(cap.get("rationale", "").strip())
    rat_block = f'<div class="cc-rationale">↳ {rationale}</div>' if rationale else ""
    return f"""
<div class="caption-card">
  <div class="cc-label {cls}">{label}</div>
  <div class="cc-text">{text}</div>
  {rat_block}
</div>"""


# ── Sidebar ───────────────────────────────────────────────────────────────────

with st.sidebar:
    st.markdown("## ✦ Caption Writer")
    st.markdown("---")

    clients = list_clients()
    if not clients:
        st.error("No profiles found in `config/clients/`.")
        st.stop()

    prev     = st.session_state.get("client")
    selected = st.selectbox(
        "**Creator**", clients,
        index=clients.index(prev) if prev in clients else 0,
    )

    if selected != prev:
        st.session_state.pop("captions", None)
        st.session_state.pop("frames",   None)
    st.session_state.client = selected

    try:
        p     = read_profile(selected)
        tone  = html.escape((p.get("tone") or "")[:90])
        ellip = "…" if len(p.get("tone", "")) > 90 else ""
        st.markdown(f"""
<div class="profile-pill">
  <div class="pp-name">{html.escape(p.get('name', selected))}</div>
  <div class="pp-handle">{html.escape(p.get('handle', ''))}</div>
  <div class="pp-meta">
    {html.escape(p.get('platform','Instagram'))} &nbsp;·&nbsp;
    {html.escape(p.get('caption_length','—'))}<br>
    <em>{tone}{ellip}</em>
  </div>
</div>""", unsafe_allow_html=True)
    except Exception:
        pass

    st.markdown("---")
    st.caption(f"{len(clients)} profile{'s' if len(clients) != 1 else ''} loaded")


# ── Tabs ──────────────────────────────────────────────────────────────────────

tab_gen, tab_board, tab_edit = st.tabs(
    ["  ✦ Generate  ", "  ＋ Onboard  ", "  ✎ Edit Profile  "]
)


# ═══════════════════════════════════════════════════════════════════════════════
# GENERATE
# ═══════════════════════════════════════════════════════════════════════════════

with tab_gen:
    st.markdown("### Generate Captions")

    up_col, opt_col = st.columns([4, 1])
    with up_col:
        uploaded = st.file_uploader(
            "Drag a video or image here",
            type=["mp4", "mov", "avi", "mkv", "webm", "jpg", "jpeg", "png", "webp"],
            label_visibility="visible",
        )
    with opt_col:
        num_frames = st.slider("Frames", 1, 10, 3)
        st.caption("For video analysis")

    if uploaded:
        if (uploaded.type or "").startswith("image/"):
            st.image(uploaded, width=360)
        else:
            st.video(uploaded)

        if st.button("✦  Generate Captions", type="primary", use_container_width=True):
            with st.status("Generating…", expanded=True) as status:
                try:
                    st.write("Extracting frames…")
                    frames = upload_to_frames(uploaded, num_frames)
                    st.session_state.frames = frames

                    st.write(f"{len(frames)} frame(s) ready — calling Claude…")
                    from src.caption_generator import generate_captions_from_frames
                    captions = generate_captions_from_frames(
                        client_name=selected,
                        frames_b64=frames,
                        config_dir=CONFIG_DIR,
                    )
                    st.session_state.captions = captions
                    status.update(label="Done.", state="complete")
                except Exception as exc:
                    status.update(label="Failed.", state="error")
                    st.error(str(exc))

    frames = st.session_state.get("frames")
    if frames:
        with st.expander(f"Analysed frames  ({len(frames)})", expanded=False):
            thumb_cols = st.columns(len(frames))
            for col, b64 in zip(thumb_cols, frames):
                col.image(base64.b64decode(b64), use_column_width=True)

    captions = st.session_state.get("captions")
    if captions:
        st.markdown("---")
        st.markdown("### Caption Options")
        cols = st.columns(3)
        for col, cap in zip(cols, captions):
            with col:
                st.markdown(caption_card_html(cap), unsafe_allow_html=True)
                with st.expander("Copy ↗"):
                    st.code(cap.get("caption", ""), language=None)


# ═══════════════════════════════════════════════════════════════════════════════
# ONBOARD
# ═══════════════════════════════════════════════════════════════════════════════

with tab_board:
    st.markdown("### New Creator Profile")
    st.caption("Answer every section as honestly as possible — the more specific, the better the captions.")

    with st.form("onboard"):

        # ── Basic info ────────────────────────────────────────────────────────
        r1, r2 = st.columns(2)
        with r1:
            ob_name     = st.text_input("Full name *",  placeholder="Alex Rivera")
            ob_handle   = st.text_input("Handle *",     placeholder="@alexrivera_fit")
        with r2:
            ob_platform = st.selectbox("Platform *",
                ["Instagram", "TikTok", "YouTube", "LinkedIn", "X / Twitter"])
            ob_audience = st.text_input("Target audience *",
                placeholder="25–35 yr old gym-goers who train 5× per week")

        r3, r4 = st.columns(2)
        with r3:
            ob_cap_len  = st.text_input("Caption length", value="50-150 words")
        with r4:
            ob_hashtags = st.text_input("Hashtag style",  value="3-5 relevant hashtags")

        st.markdown("---")

        # ── 🗣️ Voice & Patterns ───────────────────────────────────────────────
        st.markdown("#### 🗣️ Voice & Patterns")

        ob_voice_samples = st.text_area(
            "Paste 5–10 real captions or texts you've written — the more casual the better *",
            placeholder="Just dump them here, one per line. DMs, old captions, anything real.",
            height=180,
        )
        ob_punctuation = st.text_input(
            "How do you punctuate?",
            placeholder='e.g. lots of "..." and "!!" / all lowercase / no punctuation at all / proper grammar',
        )

        st.markdown("**Emojis**")
        ec1, ec2, ec3 = st.columns([1, 2, 2])
        with ec1:
            ob_use_emoji   = st.checkbox("Use emojis", value=True)
        with ec2:
            ob_pref_emoji  = st.text_input("Which ones, and when?", placeholder="🔥 when hyped, 💪 always")
        with ec3:
            ob_avoid_emoji = st.text_input("Never use these", placeholder="❤️ 😊 ✨")

        ob_signature = st.text_input(
            "What words or phrases do you use constantly without thinking?",
            placeholder="e.g. 'real talk', 'no cap', 'let's get it', 'honestly'",
        )
        ob_wrong_words = st.text_area(
            "What words sound completely wrong coming from you? *",
            placeholder="e.g. amazing, blessed, journey, transformation — anything that makes you cringe",
            height=80,
        )

        st.markdown("---")

        # ── 🎭 Tone & Register ────────────────────────────────────────────────
        st.markdown("#### 🎭 Tone & Register")

        ob_tone = st.text_area(
            "Are you naturally funny, sincere, edgy, soft, hype, sarcastic — or a mix? Describe it. *",
            placeholder="e.g. I'm mostly hype and direct, but I go softer when I talk about struggles. Never sarcastic.",
            height=100,
        )
        ob_excited = st.text_area(
            "How do you write when you're excited?",
            placeholder="e.g. short sentences, lots of caps, fire emojis, gets louder",
            height=80,
        )
        ob_vulnerable = st.text_area(
            "How do you write when you're being real or vulnerable?",
            placeholder="e.g. longer, slower pace, no emojis, starts with 'honestly' or 'real talk'",
            height=80,
        )
        ob_caption_style = st.radio(
            "Do your captions tend to be…",
            ["Short and punchy", "Longer storytelling", "Mix of both"],
            horizontal=True,
        )

        st.markdown("---")

        # ── ❌ Guardrails ─────────────────────────────────────────────────────
        st.markdown("#### ❌ Guardrails")

        ob_off_brand = st.text_area(
            "What's something you'd never say — phrases that feel off-brand or cringe to you? *",
            placeholder="e.g. 'You need this in your life', 'game changer', 'obsessed with this'",
            height=80,
        )
        ob_redirection = st.text_area(
            "How do you handle saying no or redirecting? What's your natural move?",
            placeholder="e.g. I just go quiet and ignore it / I'm direct but not rude / I always explain my reasoning",
            height=80,
        )

        ob_submit = st.form_submit_button("Save Profile →", type="primary")

    if ob_submit:
        errors = []
        if not ob_name.strip():          errors.append("Name is required.")
        if not ob_handle.strip():        errors.append("Handle is required.")
        if not ob_tone.strip():          errors.append("Tone description is required.")
        if not ob_audience.strip():      errors.append("Target audience is required.")
        if not ob_voice_samples.strip(): errors.append("Voice samples are required — paste some real captions.")
        if not ob_wrong_words.strip():   errors.append("Words that sound wrong are required.")
        if not ob_off_brand.strip():     errors.append("Off-brand phrases are required.")

        if errors:
            for e in errors:
                st.error(e)
        else:
            slug = ob_name.strip().lower().replace(" ", "_").replace("/", "_")
            new_profile = {
                "name":            ob_name.strip(),
                "handle":          ob_handle.strip(),
                "platform":        ob_platform,
                "tone":            ob_tone.strip(),
                "target_audience": ob_audience.strip(),
                "caption_length":  ob_cap_len.strip() or "50-150 words",
                "hashtag_style":   ob_hashtags.strip() or "3-5 relevant hashtags",
                "emoji_preferences": {
                    "use_emojis": ob_use_emoji,
                    "preferred":  ob_pref_emoji.strip(),
                    "avoid":      [e.strip() for e in ob_avoid_emoji.split() if e.strip()],
                },
                "voice_samples":      [l.strip() for l in ob_voice_samples.splitlines() if l.strip()],
                "punctuation_style":  ob_punctuation.strip(),
                "signature_phrases":  [p.strip() for p in ob_signature.split(",") if p.strip()],
                "banned_words":       [w.strip() for w in ob_wrong_words.split(",") if w.strip()],
                "tone_mix":           ob_tone.strip(),
                "excited_writing":    ob_excited.strip(),
                "vulnerable_writing": ob_vulnerable.strip(),
                "caption_style_preference": ob_caption_style,
                "off_brand_phrases":  [p.strip() for p in ob_off_brand.split(",") if p.strip()],
                "redirection_style":  ob_redirection.strip(),
                "best_past_content":  [],
            }
            write_profile(slug, new_profile)
            st.success(f"Saved as `{slug}.json` — select it from the sidebar to start generating.")
            st.rerun()


# ═══════════════════════════════════════════════════════════════════════════════
# EDIT PROFILE
# ═══════════════════════════════════════════════════════════════════════════════

with tab_edit:
    st.markdown(f"### Editing: `{selected}`")

    try:
        ep = read_profile(selected)
    except Exception as exc:
        st.error(f"Could not load profile: {exc}")
        st.stop()

    with st.form("edit_profile"):
        ep_tone = st.text_area("Tone & voice", value=ep.get("tone", ""), height=100)

        ec1, ec2 = st.columns(2)
        with ec1:
            ep_cap_len  = st.text_input("Caption length",
                value=ep.get("caption_length", "50-150 words"))
        with ec2:
            ep_hashtags = st.text_input("Hashtag style",
                value=ep.get("hashtag_style", ""))

        ep_banned_raw = st.text_area("Banned words (comma-separated)",
            value=", ".join(ep.get("banned_words", [])), height=80)

        prefs = ep.get("emoji_preferences", {})
        ec1, ec2, ec3 = st.columns([1, 2, 2])
        with ec1:
            ep_use_emoji   = st.checkbox("Use emojis", value=prefs.get("use_emojis", True))
        with ec2:
            ep_pref_emoji  = st.text_input("Preferred emojis",
                value=" ".join(prefs.get("preferred", [])))
        with ec3:
            ep_avoid_emoji = st.text_input("Avoid emojis",
                value=" ".join(prefs.get("avoid", [])))

        ep_submit = st.form_submit_button("Save Changes →", type="primary")

    if ep_submit:
        ep["tone"]           = ep_tone.strip()
        ep["caption_length"] = ep_cap_len.strip()
        ep["hashtag_style"]  = ep_hashtags.strip()
        ep["banned_words"]   = [w.strip() for w in ep_banned_raw.split(",") if w.strip()]
        ep["emoji_preferences"] = {
            "use_emojis": ep_use_emoji,
            "preferred":  [e.strip() for e in ep_pref_emoji.split()  if e.strip()],
            "avoid":      [e.strip() for e in ep_avoid_emoji.split() if e.strip()],
        }
        write_profile(selected, ep)
        st.success("Profile updated.")
        st.rerun()

    with st.expander("Raw JSON"):
        st.json(ep)
