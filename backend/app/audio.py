"""Silence MP3 et assemblage des segments audio, sans ffmpeg.

Edge TTS renvoie du MP3 MPEG-2 Layer III, 24 kHz, 48 kbit/s, mono.
Des fichiers MP3 de même format se concatènent simplement octet par octet.
Pour les pauses, on fabrique une trame vide de ce même format : en-tête de
4 octets puis 140 octets à zéro (aucune donnée audio = silence).
"""

SAMPLE_RATE = 24000
SAMPLES_PER_FRAME = 576  # MPEG-2 Layer III
FRAME_SECONDS = SAMPLES_PER_FRAME / SAMPLE_RATE  # 24 ms
FRAME_BYTES = 144  # 72 * 48000 / 24000

SILENT_FRAME = bytes.fromhex("fff364c4") + bytes(FRAME_BYTES - 4)


def silence(seconds: float) -> bytes:
    """Renvoie environ `seconds` secondes de silence MP3."""
    if seconds <= 0:
        return b""
    return SILENT_FRAME * round(seconds / FRAME_SECONDS)


def join_segments(segments: list[bytes], pause_seconds: float = 0) -> bytes:
    """Assemble les segments dans l'ordre, avec une pause entre chacun."""
    return silence(pause_seconds).join(segments)
