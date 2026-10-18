from app.dictation import dictate_sentences
from app.segmenter import split_sentences


def dictate(text: str) -> list[str]:
    return dictate_sentences(split_sentences(text))


def test_point_et_virgule():
    assert dictate("Le patient, âgé, va bien.") == ["Le patient virgule, âgé virgule, va bien point."]


def test_point_a_la_ligne_et_a_la_ligne():
    assert dictate("Bilan.\nTitre sans point\nFin.") == [
        "Bilan point à la ligne.",
        "Titre sans point à la ligne.",
        "Fin point.",
    ]


def test_paragraphe_ne_double_pas_a_la_ligne():
    assert dictate("Bilan.\n\n\nSuite.") == ["Bilan point à la ligne.", "Suite point."]


def test_nombres_conserves():
    assert dictate("Poids 72,5 kg à 14:30, dose 1.5 mg.") == [
        "Poids 72,5 kg à 14:30 virgule, dose 1.5 mg point."
    ]


def test_deux_points_point_virgule():
    assert dictate("Traitement : repos ; hydratation.") == [
        "Traitement deux-points, repos point-virgule, hydratation point."
    ]


def test_interrogation_exclamation_suspension():
    assert dictate("Douleur ? Oui ! Ensuite...") == [
        "Douleur point d'interrogation.",
        "Oui point d'exclamation.",
        "Ensuite points de suspension.",
    ]


def test_parentheses_et_guillemets():
    assert dictate("Douleur (intense) dite « vive ».") == [
        "Douleur ouvrez la parenthèse, intense, fermez la parenthèse, "
        "dite ouvrez les guillemets, vive, fermez les guillemets, point."
    ]


def test_guillemets_droits_alternes():
    assert dictate('Il dit "non" puis "oui".') == [
        "Il dit ouvrez les guillemets, non, fermez les guillemets, puis "
        "ouvrez les guillemets, oui, fermez les guillemets, point."
    ]


def test_tiret_en_debut_de_ligne():
    assert dictate("Antécédents :\n- HTA ;\n• diabète") == [
        "Antécédents deux-points, à la ligne.",
        "tiret, HTA point-virgule, à la ligne.",
        "tiret, diabète.",
    ]


def test_abreviations_sans_point():
    assert dictate("Le Dr. Martin et M. Durand voient Mme. Petit.") == [
        "Le Dr. Martin et M. Durand voient Mme. Petit point."
    ]
