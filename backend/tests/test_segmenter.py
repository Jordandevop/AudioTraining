from app.segmenter import Sentence, group_chunks, split_long, split_sentences


def test_decoupe_en_phrases():
    assert split_sentences("Phrase un. Phrase deux ? Trois !") == [
        Sentence("Phrase un."),
        Sentence("Phrase deux ?"),
        Sentence("Trois !"),
    ]


def test_retours_a_la_ligne():
    assert split_sentences("Un.\nDeux\n\nTrois.") == [
        Sentence("Un.", new_line=True),
        Sentence("Deux", new_line=True),
        Sentence("Trois."),
    ]


def test_abreviations_et_decimales_ne_coupent_pas():
    assert split_sentences("Le Dr. Martin, J. Petit et M. Durand : 1.5 mg. Fin.") == [
        Sentence("Le Dr. Martin, J. Petit et M. Durand : 1.5 mg."),
        Sentence("Fin."),
    ]


def test_guillemet_fermant_reste_avec_la_phrase():
    assert split_sentences("Il dit « oui. » Puis part.") == [
        Sentence("Il dit « oui. »"),
        Sentence("Puis part."),
    ]


def test_texte_vide():
    assert split_sentences("  \n\n ") == []


def test_split_long_respecte_la_limite():
    pieces = split_long("mot " * 1000, max_chars=100)
    assert all(len(piece) <= 100 for piece in pieces)
    assert " ".join(pieces).split() == ["mot"] * 1000


def test_group_chunks_regroupe_dans_l_ordre():
    units = [f"Phrase {i}." for i in range(100)]
    chunks = group_chunks(units, max_chars=50)
    assert all(len(chunk) <= 50 for chunk in chunks)
    assert " ".join(chunks) == " ".join(units)
