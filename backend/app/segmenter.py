"""Découpage du texte en phrases, puis en blocs pour la synthèse vocale."""

import re
from dataclasses import dataclass

# Abréviations dont le point ne termine pas la phrase (comparées en minuscules).
ABBREVIATIONS = {
    "dr", "drs", "pr", "mme", "mmes", "mlle", "mlles", "me", "cf", "etc", "ex",
    "env", "cp", "vs", "st", "ste", "av", "bd", "tél", "tel", "fig", "p", "pp",
    "réf", "ref", "dept", "dépt", "sq",
}

SENTENCE_END = re.compile(r"(\.{3}|…|[.!?])+(?=[\s»\")]*(\s|$))")
CLOSING_AFTER_END = re.compile(r"[\s»\")]*[»\")]")
MAX_CHUNK_CHARS = 3000


@dataclass
class Sentence:
    text: str
    new_line: bool = False  # la phrase est suivie d'un retour à la ligne


def is_abbreviation_dot(text: str, dot_index: int) -> bool:
    """Vrai si le point en position `dot_index` appartient à une abréviation."""
    match = re.search(r"(\w+)$", text[:dot_index])
    if not match:
        return False
    word = match.group(1)
    if word == "M":  # « M. Dupont » (mais pas « 5 m. »)
        return True
    if len(word) == 1 and word.isupper():  # initiale : « J. Martin »
        return True
    return word.lower() in ABBREVIATIONS


def split_sentences(text: str) -> list[Sentence]:
    """Découpe le texte en phrases en gardant la trace des retours à la ligne."""
    sentences: list[Sentence] = []
    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    for line in lines:
        line = " ".join(line.split())
        if not line:
            # Ligne vide : le retour à la ligne est déjà noté sur la phrase précédente.
            continue
        start = 0
        for match in SENTENCE_END.finditer(line):
            if match.group() == "." and is_abbreviation_dot(line, match.start()):
                continue
            end = match.end()
            # Inclure les guillemets ou parenthèses fermants qui suivent.
            closing = CLOSING_AFTER_END.match(line, end)
            if closing:
                end = closing.end()
            piece = line[start:end].strip()
            if piece:
                sentences.append(Sentence(piece))
            start = end
        rest = line[start:].strip()
        if rest:
            sentences.append(Sentence(rest))
        if sentences:
            sentences[-1].new_line = True
    if sentences:
        sentences[-1].new_line = False  # pas de « à la ligne » à la toute fin
    return sentences


def split_long(text: str, max_chars: int = MAX_CHUNK_CHARS) -> list[str]:
    """Coupe un texte trop long sur les espaces."""
    if len(text) <= max_chars:
        return [text]
    pieces: list[str] = []
    current = ""
    for word in text.split(" "):
        if current and len(current) + 1 + len(word) > max_chars:
            pieces.append(current)
            current = word
        else:
            current = f"{current} {word}" if current else word
    if current:
        pieces.append(current)
    return pieces


def group_chunks(units: list[str], max_chars: int = MAX_CHUNK_CHARS) -> list[str]:
    """Regroupe des phrases en blocs d'au plus `max_chars` caractères."""
    chunks: list[str] = []
    current = ""
    for unit in units:
        for piece in split_long(unit, max_chars):
            if current and len(current) + 1 + len(piece) > max_chars:
                chunks.append(current)
                current = piece
            else:
                current = f"{current} {piece}" if current else piece
    if current:
        chunks.append(current)
    return chunks
