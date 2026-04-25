import base64
from pathlib import Path

import cv2


def extract_frames(video_path: str, num_frames: int = 3) -> list[str]:
    """Extract evenly-spaced frames from a video file.

    Returns a list of base64-encoded JPEG strings ready for the Anthropic vision API.
    Raises ValueError if the video cannot be opened or yields no frames.
    """
    path = Path(video_path)
    if not path.exists():
        raise FileNotFoundError(f"Video not found: {video_path}")

    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        raise ValueError(f"OpenCV cannot open video: {video_path}")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if total_frames == 0:
        cap.release()
        raise ValueError(f"Video reports zero frames: {video_path}")

    num_frames = max(1, min(num_frames, total_frames))

    if num_frames == 1:
        indices = [total_frames // 2]
    else:
        step = (total_frames - 1) / (num_frames - 1)
        indices = [round(i * step) for i in range(num_frames)]

    frames_b64: list[str] = []
    for idx in indices:
        cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
        ret, frame = cap.read()
        if not ret:
            continue
        _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        b64 = base64.standard_b64encode(buffer.tobytes()).decode("utf-8")
        frames_b64.append(b64)

    cap.release()

    if not frames_b64:
        raise ValueError(f"Could not read any frames from: {video_path}")

    return frames_b64
