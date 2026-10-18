"""Du texte collé au fichier MP3 final."""

import asyncio

from .audio import join_segments
from .dictation import dictate_sentences
from .segmenter import group_chunks, split_long, split_sentences
from .tts import TTSProvider


def prepare_segments(text: str, read_punctuation: bool, with_pauses: bool) -> list[str]:
    """Découpe le texte en segments à envoyer un par un au fournisseur de voix.

    Avec des pauses, chaque phrase est un segment (la pause est insérée entre deux).
    Sans pause, les phrases sont regroupées en gros blocs pour limiter les appels.
    """
    sentences = split_sentences(text)
    if read_punctuation:
        units = dictate_sentences(sentences)
    else:
        units = [sentence.text for sentence in sentences]
    if with_pauses:
        return [piece for unit in units for piece in split_long(unit)]
    return group_chunks(units)


async def generate_mp3(
    text: str,
    *,
    provider: TTSProvider,
    voice: str,
    rate: int,
    read_punctuation: bool,
    pause_seconds: float,
    concurrency: int,
) -> bytes:
    segments = prepare_segments(text, read_punctuation, with_pauses=pause_seconds > 0)
    semaphore = asyncio.Semaphore(concurrency)

    async def synthesize(segment: str) -> bytes:
        async with semaphore:
            return await provider.synthesize(segment, voice, rate)

    audios = await asyncio.gather(*(synthesize(segment) for segment in segments))
    return join_segments(list(audios), pause_seconds)
