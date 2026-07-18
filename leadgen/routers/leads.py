"""Lead webhook and RODO endpoints."""

from __future__ import annotations

import logging
import re
from typing import Any, Literal

import httpx
from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel, Field, field_validator

from leadgen.config import settings
from leadgen.services import db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["leads"])

PHONE_RE = re.compile(r"^\+?[\d\s\-()]{7,20}$")
NIP_RE = re.compile(r"^\d{10}$")


class CalcSnapshot(BaseModel):
    product_type: str | None = None
    monthly_payment_pln: float | None = None
    down_payment_pln: float | None = None
    term_months: int | None = None
    rate_annual: float | None = None
    rv_pct: float | None = None
    extra: dict[str, Any] = Field(default_factory=dict)


class LeadWebhookPayload(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    phone: str = Field(..., min_length=7, max_length=20)
    nip: str | None = None
    model: str | None = None
    price_pln: int | None = Field(default=None, ge=0)
    source_article_slug: str | None = None
    source_type: str | None = None
    funnel: Literal["lease", "insurance_a", "insurance_b"] = "lease"
    partner: str | None = None
    consent: bool = Field(..., description="User must accept consent checkbox")
    consent_text: str | None = None
    calc_snapshot: CalcSnapshot | dict[str, Any] | None = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        cleaned = v.strip()
        if not PHONE_RE.match(cleaned):
            raise ValueError("Nieprawidłowy numer telefonu")
        return cleaned

    @field_validator("nip")
    @classmethod
    def validate_nip(cls, v: str | None) -> str | None:
        if v is None or v.strip() == "":
            return None
        cleaned = re.sub(r"[\s\-]", "", v)
        if not NIP_RE.match(cleaned):
            raise ValueError("Nieprawidłowy NIP (10 cyfr)")
        return cleaned


class LeadWebhookResponse(BaseModel):
    ok: bool
    lead_id: int
    status: str
    message_pl: str


class RodoEraseResponse(BaseModel):
    ok: bool
    erased_ids: list[int]
    message_pl: str


async def forward_to_broker_crm(payload: dict[str, Any]) -> bool:
    url = settings.broker_crm_webhook_url
    if not url:
        return False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
        return True
    except Exception:
        logger.exception("Failed to forward lead to broker CRM")
        return False


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "idrivecars-leadgen"}


@router.post("/webhook/lead", response_model=LeadWebhookResponse)
async def webhook_lead(request: Request, body: LeadWebhookPayload) -> LeadWebhookResponse:
    if not body.consent:
        raise HTTPException(
            status_code=400,
            detail="Wymagana zgoda na przetwarzanie danych osobowych",
        )

    consent_text = body.consent_text or settings.consent_checkbox_text
    consent_at = db.utc_now()
    client_ip = request.client.host if request.client else None
    ip_hash = db.hash_ip(client_ip)
    user_agent = request.headers.get("user-agent")

    snapshot: dict[str, Any] | None = None
    if body.calc_snapshot:
        if isinstance(body.calc_snapshot, CalcSnapshot):
            snapshot = body.calc_snapshot.model_dump()
        else:
            snapshot = dict(body.calc_snapshot)

    lead_id = db.insert_lead(
        source_article_slug=body.source_article_slug,
        source_type=body.source_type,
        funnel=body.funnel,
        name=body.name.strip(),
        phone=body.phone,
        nip=body.nip,
        model=body.model,
        price_pln=body.price_pln,
        partner=body.partner,
        consent_text=consent_text,
        consent_at=consent_at,
        ip_hash=ip_hash,
        calc_snapshot=snapshot,
        status="sent",
    )

    db.insert_consent_log(
        lead_id=lead_id,
        consent_text=consent_text,
        consent_at=consent_at,
        ip_hash=ip_hash,
        user_agent=user_agent,
    )

    crm_payload = {
        "lead_id": lead_id,
        "name": body.name,
        "phone": body.phone,
        "nip": body.nip,
        "model": body.model,
        "price_pln": body.price_pln,
        "source_article_slug": body.source_article_slug,
        "funnel": body.funnel,
        "partner": body.partner,
        "calc_snapshot": snapshot,
    }
    await forward_to_broker_crm(crm_payload)

    return LeadWebhookResponse(
        ok=True,
        lead_id=lead_id,
        status="sent",
        message_pl="Dziękujemy! Skontaktujemy się wkrótce.",
    )


@router.delete("/rodo/erase", response_model=RodoEraseResponse)
async def rodo_erase(
    phone: str | None = Query(default=None, description="Numer telefonu do usunięcia"),
    lead_id: int | None = Query(default=None, description="ID leada do usunięcia"),
) -> RodoEraseResponse:
    if not phone and lead_id is None:
        raise HTTPException(
            status_code=400,
            detail="Podaj phone lub lead_id",
        )

    erased: list[int] = []
    if lead_id is not None:
        if db.soft_delete_lead_by_id(lead_id):
            erased.append(lead_id)
    elif phone:
        erased = db.soft_delete_lead_by_phone(phone.strip())

    if not erased:
        raise HTTPException(status_code=404, detail="Nie znaleziono danych do usunięcia")

    logger.info("RODO erase completed for lead_ids=%s", erased)
    return RodoEraseResponse(
        ok=True,
        erased_ids=erased,
        message_pl="Dane osobowe zostały usunięte zgodnie z RODO.",
    )
