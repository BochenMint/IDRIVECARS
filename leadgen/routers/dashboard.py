"""Simple HTML dashboard for funnel and commission stats."""

from __future__ import annotations

import html
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import HTMLResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from leadgen.config import settings
from leadgen.services import db

router = APIRouter(tags=["dashboard"])

_bearer = HTTPBearer(auto_error=False)


def verify_dashboard_token(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    token: str | None = Query(default=None),
) -> None:
    provided = token
    if credentials and credentials.scheme.lower() == "bearer":
        provided = credentials.credentials
    if not provided or provided != settings.dashboard_token:
        raise HTTPException(status_code=401, detail="Brak autoryzacji")


def _pct(numerator: int, denominator: int) -> str:
    if denominator == 0:
        return "0%"
    return f"{100 * numerator / denominator:.1f}%"


def _render_table(headers: list[str], rows: list[list[str]]) -> str:
    th = "".join(f"<th>{html.escape(h)}</th>" for h in headers)
    body_rows = []
    for row in rows:
        tds = "".join(f"<td>{html.escape(str(c))}</td>" for c in row)
        body_rows.append(f"<tr>{tds}</tr>")
    return f"<table><thead><tr>{th}</tr></thead><tbody>{''.join(body_rows)}</tbody></table>"


@router.get("/dashboard", response_class=HTMLResponse)
async def dashboard(
    _: Annotated[None, Depends(verify_dashboard_token)],
) -> HTMLResponse:
    funnel_stats = db.get_funnel_stats()
    commissions = db.get_commissions_summary()

    funnel_rows: list[list[str]] = []
    for s in funnel_stats:
        total = int(s["total"])
        converted = int(s["converted"])
        funnel_rows.append([
            s["source_article_slug"],
            s["funnel"],
            str(total),
            str(s["sent"]),
            str(s["qualified"]),
            str(converted),
            str(s["deleted"]),
            _pct(converted, total),
        ])

    commission_rows: list[list[str]] = []
    for c in commissions:
        commission_rows.append([
            c["partner"],
            c["settlement"],
            c["status"],
            str(c["count"]),
            f"{float(c['total_pln']):,.2f} PLN",
        ])

    funnel_table = _render_table(
        ["Artykuł", "Lejek", "Razem", "Wysłane", "Kwalifikowane", "Skonwertowane", "Usunięte", "Konwersja"],
        funnel_rows or [["—", "—", "0", "0", "0", "0", "0", "0%"]],
    )
    commission_table = _render_table(
        ["Partner", "Rozliczenie", "Status", "Liczba", "Suma"],
        commission_rows or [["—", "—", "—", "0", "0.00 PLN"]],
    )

    page = f"""<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>idrivecars.pl – Panel leadów</title>
  <style>
    body {{ font-family: system-ui, sans-serif; margin: 2rem; background: #f8f9fa; color: #212529; }}
    h1 {{ font-size: 1.5rem; }}
    h2 {{ font-size: 1.1rem; margin-top: 2rem; }}
    table {{ border-collapse: collapse; width: 100%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.1); }}
    th, td {{ border: 1px solid #dee2e6; padding: 0.5rem 0.75rem; text-align: left; }}
    th {{ background: #e9ecef; }}
    tr:nth-child(even) {{ background: #f8f9fa; }}
    .meta {{ color: #6c757d; font-size: 0.875rem; }}
  </style>
</head>
<body>
  <h1>Panel leadów – idrivecars.pl</h1>
  <p class="meta">Konwersje per artykuł źródłowy i podsumowanie prowizji.</p>

  <h2>Lejek konwersji</h2>
  {funnel_table}

  <h2>Prowizje</h2>
  {commission_table}
</body>
</html>"""
    return HTMLResponse(content=page)
