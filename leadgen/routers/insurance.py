"""Insurance routing: path A (affiliate) vs path B (OFWCA form)."""

from __future__ import annotations

import logging
from typing import Any, Literal

import httpx
from fastapi import APIRouter
from pydantic import BaseModel, Field

from leadgen.config import settings
from leadgen.services.affiliate import insurance_compare_widget

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/insurance", tags=["insurance"])


class InsuranceContext(BaseModel):
    new_car: bool = False
    after_lease_calc: bool = False
    used_car: bool = False
    oc_only: bool = False
    subid: str | None = None
    article_slug: str | None = None
    model: str | None = None


class InsuranceRouteResponse(BaseModel):
    path: Literal["A", "B"]
    funnel: Literal["insurance_a", "insurance_b"]
    message_pl: str
    affiliate: dict[str, Any] | None = None
    form_url: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


async def notify_telegram(message: str) -> bool:
    token = settings.telegram_bot_token
    chat_id = settings.telegram_chat_id
    if not token or not chat_id:
        logger.warning("Telegram not configured; skipping notification")
        return False
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json={"chat_id": chat_id, "text": message})
            resp.raise_for_status()
        return True
    except Exception:
        logger.exception("Telegram notification failed")
        return False


def _resolve_path(ctx: InsuranceContext) -> tuple[Literal["A", "B"], str]:
    """
    Routing rules:
    - new car / after lease calc → path B IF OFWCA_ACTIVE else path A
    - used / pure OC / no financing context → path A
    """
    has_financing_context = ctx.new_car or ctx.after_lease_calc

    if has_financing_context and settings.ofwca_active:
        return "B", (
            "Na podstawie kontekstu finansowania kierujemy do formularza OFWCA. "
            "Doradca skontaktuje się z Tobą."
        )

    if ctx.used_car or ctx.oc_only or not has_financing_context:
        return "A", (
            "Porównaj oferty ubezpieczeń w porównywarce partnerskiej. "
            "Link oznaczony jako treść komercyjna (UOKiK)."
        )

    # new car / after lease but OFWCA inactive → path A
    return "A", (
        "Porównaj oferty ubezpieczeń dla nowego auta w porównywarce partnerskiej."
    )


@router.post("/route", response_model=InsuranceRouteResponse)
async def insurance_route(ctx: InsuranceContext) -> InsuranceRouteResponse:
    path, message_pl = _resolve_path(ctx)
    subid = ctx.subid or ctx.article_slug

    if path == "B":
        telegram_msg = (
            f"🚗 Nowy lead ubezpieczeniowy (ścieżka B/OFWCA)\n"
            f"Model: {ctx.model or '—'}\n"
            f"Artykuł: {ctx.article_slug or '—'}\n"
            f"Kontekst: new={ctx.new_car}, lease_calc={ctx.after_lease_calc}"
        )
        await notify_telegram(telegram_msg)

        return InsuranceRouteResponse(
            path="B",
            funnel="insurance_b",
            message_pl=message_pl,
            form_url=settings.ofwca_form_url,
            metadata={
                "ofwca_active": True,
                "telegram_notified": bool(settings.telegram_bot_token),
            },
        )

    affiliate = insurance_compare_widget(
        subid=subid,
        context=ctx.model_dump(),
    )
    return InsuranceRouteResponse(
        path="A",
        funnel="insurance_a",
        message_pl=message_pl,
        affiliate=affiliate,
        metadata=affiliate.get("metadata", {}),
    )
