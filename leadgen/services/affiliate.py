"""Affiliate link builder with UOKiK-compliant metadata."""

from __future__ import annotations

from typing import Any
from urllib.parse import urlencode, urlparse, urlunparse, parse_qsl

from leadgen.config import settings

# UOKiK requires clear marking of commercial/partner content
UOKIK_DISCLOSURE_PL = (
    "Materiał zawiera linki partnerskie. idrivecars.pl może otrzymać prowizję "
    "za polecenie usług finansowych lub ubezpieczeniowych."
)
REL_SPONSORED = "sponsored noopener noreferrer"


def build_affiliate_url(
    base_url: str,
    *,
    subid: str | None = None,
    extra_params: dict[str, str] | None = None,
) -> str:
    """Build affiliate URL with subid tracking parameter."""
    parsed = urlparse(base_url)
    params = dict(parse_qsl(parsed.query))
    params["partner"] = settings.insurance_affiliate_partner_id
    if subid:
        params["subid"] = subid
    if extra_params:
        params.update(extra_params)
    new_query = urlencode(params)
    return urlunparse(parsed._replace(query=new_query))


def affiliate_response(
    url: str,
    *,
    subid: str | None = None,
    partner_name: str = "partner",
) -> dict[str, Any]:
    """Wrap affiliate URL with UOKiK disclosure and rel=sponsored metadata."""
    final_url = build_affiliate_url(url, subid=subid)
    return {
        "url": final_url,
        "metadata": {
            "rel": REL_SPONSORED,
            "disclosure_pl": UOKIK_DISCLOSURE_PL,
            "partner": partner_name,
            "is_commercial": True,
            "uokik_marked": True,
        },
    }


def insurance_compare_widget(
    *,
    subid: str | None = None,
    context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Path A: affiliate insurance comparison widget."""
    extra: dict[str, str] = {}
    if context:
        if context.get("new_car"):
            extra["ctx"] = "new"
        elif context.get("used_car"):
            extra["ctx"] = "used"
        elif context.get("oc_only"):
            extra["ctx"] = "oc"
    return affiliate_response(
        settings.insurance_affiliate_base_url,
        subid=subid,
        partner_name=settings.insurance_affiliate_partner_id,
    )
