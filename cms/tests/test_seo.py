"""Tests for CMS SEO utilities."""

from cms.services.seo import extract_lead, plain_text_to_markdown
from cms.services.slugify import slugify


def test_slugify_polish_chars():
    assert slugify("Pierwsza jazda Skody Octavii") == "pierwsza-jazda-skody-octavii"
    assert slugify("Łódź — test napędu") == "lodz-test-napedu"
    assert slugify("Ąęćłńóśźż") == "aeclnoszz"


def test_slugify_empty_fallback():
    assert slugify("!!!") == "artykul"


def test_extract_lead_truncation():
    body = (
        "To jest pierwszy akapit z wystarczającą liczbą znaków, "
        "który powinien zostać użyty jako lead artykułu motoryzacyjnego.\n\n"
        "Drugi akapit jest dłuższy i nie powinien być brany pod uwagę jeśli pierwszy jest sensowny."
    )
    lead = extract_lead(body)
    assert len(lead) <= 163
    assert lead.startswith("To jest pierwszy")


def test_plain_text_to_paragraphs():
    text = "Linia jedna\n\nLinia dwa"
    md = plain_text_to_markdown(text)
    assert md == "Linia jedna\n\nLinia dwa"
