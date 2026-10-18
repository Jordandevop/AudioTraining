import io

from mutagen.mp3 import MP3

from app.audio import FRAME_BYTES, SILENT_FRAME, join_segments, silence


def duration(mp3: bytes) -> float:
    return MP3(io.BytesIO(mp3)).info.length


def test_trame_silencieuse_au_format_edge():
    assert len(SILENT_FRAME) == FRAME_BYTES
    info = MP3(io.BytesIO(SILENT_FRAME * 10)).info
    assert (info.version, info.layer, info.sample_rate, info.bitrate, info.channels) == (
        2, 3, 24000, 48000, 1,
    )


def test_duree_du_silence():
    assert abs(duration(silence(3)) - 3) < 0.03
    assert silence(0) == b""


def test_assemblage_avec_pauses():
    segments = [silence(1), silence(2), silence(1)]
    assert abs(duration(join_segments(segments, pause_seconds=2)) - 8) < 0.05


def test_assemblage_sans_pause():
    assert join_segments([b"a", b"b"]) == b"ab"
