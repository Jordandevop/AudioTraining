"""Transforme la ponctuation en mots, comme dans une dictée médicale.

On garde la vraie ponctuation après chaque mot ajouté (« virgule, »)
pour que la voix marque une petite pause, comme le ferait un médecin.
"""

import re

from .segmenter import Sentence, is_abbreviation_dot

INTERNAL_PUNCTUATION = re.compile(r"\.{3}|…|[,;:?!.()«»\"“”]")
TERMINAL_PUNCTUATION = re.compile(r"(\.{3}|…|[.!?])+$")
LIST_MARKER = re.compile(r"^[-–—•*]\s+")

OPEN_QUOTE = " ouvrez les guillemets, "
CLOSE_QUOTE = ", fermez les guillemets, "


def dictate_sentences(sentences: list[Sentence]) -> list[str]:
    """Renvoie chaque phrase avec sa ponctuation lue à voix haute."""
    state = {"quote_open": False}  # pour les guillemets droits "…" sur plusieurs phrases
    return [_dictate(sentence, state) for sentence in sentences]


def _dictate(sentence: Sentence, state: dict) -> str:
    text = sentence.text
    prefix = ""
    marker = LIST_MARKER.match(text)
    if marker:
        prefix = "tiret, "
        text = text[marker.end():]

    terminal = ""
    end = TERMINAL_PUNCTUATION.search(text)
    if end and not (end.group() == "." and is_abbreviation_dot(text, end.start())):
        terminal = end.group()
        text = text[: end.start()]

    body = INTERNAL_PUNCTUATION.sub(lambda match: _replace(match, text, state), text)
    return _tidy(prefix + body + _ending(terminal, sentence.new_line))


def _replace(match: re.Match, text: str, state: dict) -> str:
    sign = match.group()
    before = text[match.start() - 1] if match.start() > 0 else ""
    after = text[match.end()] if match.end() < len(text) else ""
    between_digits = before.isdigit() and after.isdigit()

    if sign == ",":
        return sign if between_digits else " virgule, "  # 2,5 mg
    if sign == ":":
        return sign if between_digits else " deux-points, "  # 14:30
    if sign == ".":
        ends_word = after == "" or after.isspace() or after in "»\")”"
        if is_abbreviation_dot(text, match.start()) or not ends_word:
            return sign  # Dr. / 1.5 / www.site.fr
        return " point, "
    if sign == ";":
        return " point-virgule, "
    if sign == "?":
        return " point d'interrogation, "
    if sign == "!":
        return " point d'exclamation, "
    if sign in ("...", "…"):
        return " points de suspension, "
    if sign == "(":
        return " ouvrez la parenthèse, "
    if sign == ")":
        return ", fermez la parenthèse, "
    if sign in "«“":
        return OPEN_QUOTE
    if sign in "»”":
        return CLOSE_QUOTE
    # Guillemet droit : ouvrant puis fermant, en alternance.
    state["quote_open"] = not state["quote_open"]
    return OPEN_QUOTE if state["quote_open"] else CLOSE_QUOTE


def _ending(terminal: str, new_line: bool) -> str:
    if not terminal:
        return " à la ligne." if new_line else "."
    if "…" in terminal or "..." in terminal:
        word = " points de suspension."
    elif "?" in terminal:
        word = " point d'interrogation."
    elif "!" in terminal:
        word = " point d'exclamation."
    else:
        return " point à la ligne." if new_line else " point."
    return word + (" À la ligne." if new_line else "")


def _tidy(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\s+([,.])", r"\1", text)  # pas d'espace avant , ou .
    text = re.sub(r",(\s*,)+", ",", text)  # « , , » → « , »
    text = re.sub(r",\s*\.", ".", text)  # « , . » → « . »
    return text.strip(" ,")
