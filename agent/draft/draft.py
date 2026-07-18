"""Generate Polish news drafts via local LLM with structured stub fallback."""

from __future__ import annotations

import json
import logging
import re
import unicodedata
from datetime import datetime, timezone
from typing import Any

import httpx

from config import CONFIG
from draft.banned_phrases import lint_text
from models import DraftDocument, EnrichResult, IngestItem

logger = logging.getLogger(__name__)


def slugify(title: str, published_at: datetime | None = None) -> str:
    date_prefix = (published_at or datetime.now(timezone.utc)).strftime("%Y%m%d")
    normalized = unicodedata.normalize("NFD", title.lower())
    ascii_title = "".join(c for c in normalized if unicodedata.category(c) != "Mn")
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_title).strip("-")
    return f"{date_prefix}-{slug}"[:80].strip("-")


def _format_facts(item: IngestItem, enrich: EnrichResult) -> dict[str, Any]:
    signals = enrich.signals
    return {
        "title": item.title,
        "brand": item.brand,
        "source_name": item.source_name,
        "source_url": item.url,
        "summary": item.summary,
        "pl_price_pln": signals.pl_price_pln,
        "pl_premiere_date": signals.pl_premiere_date,
        "lease_rent_from_finance": signals.lease_rent_from_finance,
        "segment_comparison_table": signals.segment_comparison_table,
        "archive_test_link": signals.archive_test_link,
    }


def _build_prompt(facts: dict[str, Any]) -> str:
    return (
        "Napisz artykuł newsowy po polsku dla idrivecars.pl na podstawie faktów JSON.\n"
        "Struktura:\n"
        "1. Lead z konkretnym faktem (cena, data premiery lub parametr).\n"
        "2. Sekcja 'Co to znaczy dla polskiego kupującego'.\n"
        "3. Krótkie porównanie z konkurencją w segmencie.\n"
        "4. Placeholdery galerii: [GALERIA: zdjęcia producenta].\n"
        "5. CTA finansowania/leasingu z linkiem do lejka.\n"
        "Unikaj fraz: w dzisiejszych czasach, warto zauważyć, w świecie motoryzacji, pustych superlatywów.\n"
        "Ton: rzeczowy, pierwsza osoba dopuszczalna, krótkie akapity.\n"
        f"Fakty:\n{json.dumps(facts, ensure_ascii=False, indent=2)}"
    )


def _call_local_llm(prompt: str) -> str | None:
    """
    Call local OpenAI-compatible chat endpoint.

    TODO(Mac): ensure llama.cpp / mlx server exposes /v1/chat/completions with VOICE_LORA adapter.
    """

    url = CONFIG.local_llm_url.rstrip("/")
    endpoint = f"{url}/v1/chat/completions"
    payload = {
        "model": CONFIG.voice_lora,
        "messages": [
            {
                "role": "system",
                "content": (
                    "Jesteś redaktorem motoryzacyjnym idrivecars.pl. "
                    "Piszesz konkretnie, bez marketingowego bełkotu."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.4,
        "max_tokens": 1800,
    }

    try:
        with httpx.Client(timeout=CONFIG.llm_timeout_seconds) as client:
            response = client.post(endpoint, json=payload)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"].strip()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Local LLM unreachable at %s: %s", endpoint, exc)
        return None


def _stub_draft(facts: dict[str, Any]) -> tuple[str, str, str]:
    """Structured fallback when LLM is offline."""

    title = facts["title"]
    brand = facts["brand"]
    price = facts.get("pl_price_pln")
    premiere = facts.get("pl_premiere_date")
    lease = facts.get("lease_rent_from_finance")

    lead_fact = (
        f"Cena od {price:,.0f} zł".replace(",", " ")
        if price
        else premiere
        or f"{brand} potwierdza nowe informacje dla rynku polskiego"
    )

    lead = f"{lead_fact} – {title}."
    body_parts = [
        f"## Co to znaczy dla polskiego kupującego\n",
        (
            f"Jeśli rozważasz {brand}, ten news dotyczy konkretnej decyzji zakupowej: "
            f"{'ceny w Polsce' if price else 'terminu premiery' if premiere else 'oferty dealerskiej'}."
        ),
        "\n## Porównanie w segmencie\n",
        (
            "W tym segmencie liczy się nie tylko cena katalogowa, ale też koszt posiadania, "
            "dostępność w salonach i różnica w wyposażeniu względem najbliższej konkurencji."
        ),
        "\n[GALERIA: zdjęcia producenta]\n",
    ]

    if facts.get("archive_test_link"):
        body_parts.append(
            f"\nW archiwum idrivecars.pl mamy też test tej marki: {facts['archive_test_link']}.\n"
        )

    cta_url = f"https://idrivecars.pl/leasing?brand={brand.lower()}"
    # Polish user-facing CTA string.
    if lease:
        lease_fmt = f"{lease:,.0f}".replace(",", " ")
        body_parts.append(
            f"\n**Finansowanie:** orientacyjna rata od ok. {lease_fmt} zł/mies. "
            f"[Sprawdź kalkulację →]({cta_url})\n"
        )
    else:
        body_parts.append(f"\n[Sprawdź leasing i finansowanie →]({cta_url})\n")

    body = "\n".join(body_parts)
    return title, lead, body


def generate_draft(item: IngestItem, enrich: EnrichResult) -> DraftDocument:
    """Generate draft from enriched facts using local LLM or stub fallback."""

    facts = _format_facts(item, enrich)
    prompt = _build_prompt(facts)
    llm_body = _call_local_llm(prompt)
    is_stub = llm_body is None

    if is_stub:
        title, lead, body = _stub_draft(facts)
    else:
        title = facts["title"]
        lead = llm_body.split("\n\n", 1)[0].strip()
        body = llm_body

    lint = lint_text(f"{lead}\n{body}")
    slug = slugify(title, item.published_at)

    draft = DraftDocument(
        item_id=item.id,
        slug=slug,
        title=title,
        lead=lead,
        body_markdown=body,
        source_url=item.url,
        source_name=item.source_name,
        brand=item.brand,
        facts=facts,
        is_stub=is_stub,
        banned_phrase_hits=lint.hits,
    )

    CONFIG.drafts_dir.mkdir(parents=True, exist_ok=True)
    out_path = CONFIG.drafts_dir / f"{slug}.json"
    out_path.write_text(draft.model_dump_json(indent=2), encoding="utf-8")
    logger.info("Draft saved slug=%s stub=%s hits=%s", slug, is_stub, lint.hits)
    return draft
