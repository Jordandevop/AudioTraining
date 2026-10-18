"""Du texte collé au fichier MP3 final."""

import asyncio

from .audio import join_segments
from .dictation import dictate_sentences
from .segmenter import group_chunks, split_long, split_sentences
from .tts import TTSProvider

PREVIEW_SENTENCE_CHARS = 300  # longueur maximale d'une phrase dans un extrait


def prepare_segments(
    text: str,
    read_punctuation: bool,
    with_pauses: bool,
    max_sentences: int | None = None,
) -> list[str]:
    """Découpe le texte en segments à envoyer un par un au fournisseur de voix.

    Avec des pauses, chaque phrase est un segment (la pause est insérée entre deux).
    Sans pause, les phrases sont regroupées en gros blocs pour limiter les appels.
    Avec `max_sentences` (extrait), seules les premières phrases sont gardées,
    chacune limitée à PREVIEW_SENTENCE_CHARS caractères.
    """
    sentences = split_sentences(text)
    if max_sentences is not None:
        sentences = sentences[:max_sentences]
        for sentence in sentences:
            sentence.text = split_long(sentence.text, PREVIEW_SENTENCE_CHARS)[0]
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
    max_sentences: int | None = None,
) -> bytes:
    segments = prepare_segments(
        text, read_punctuation, with_pauses=pause_seconds > 0, max_sentences=max_sentences
    )
    semaphore = asyncio.Semaphore(concurrency)

    async def synthesize(segment: str) -> bytes:
        async with semaphore:
            return await provider.synthesize(segment, voice, rate)

    audios = await asyncio.gather(*(synthesize(segment) for segment in segments))
    return join_segments(list(audios), pause_seconds)
