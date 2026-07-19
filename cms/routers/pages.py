"""HTML UI routes for the owner CMS."""

from __future__ import annotations

from fastapi import APIRouter, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

from cms.auth import clear_session_cookie, create_session_token, set_session_cookie, verify_password
from cms.config import CMS_ROOT, CONTENT_TYPES
from cms.services import content

router = APIRouter(prefix="/cms", tags=["pages"])
templates = Jinja2Templates(directory=str(CMS_ROOT / "templates"))


@router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request, error: str | None = None) -> HTMLResponse:
    return templates.TemplateResponse(
        request,
        "login.html",
        {"error": error},
    )


@router.post("/login")
async def login_submit(request: Request, password: str = Form(...)) -> RedirectResponse:
    if not verify_password(password):
        return RedirectResponse(url="/cms/login?error=1", status_code=303)
    response = RedirectResponse(url="/cms/", status_code=303)
    set_session_cookie(response, create_session_token())
    return response


@router.post("/logout")
async def logout() -> RedirectResponse:
    response = RedirectResponse(url="/cms/login", status_code=303)
    clear_session_cookie(response)
    return response


@router.get("/", response_class=HTMLResponse)
async def dashboard(request: Request) -> HTMLResponse:
    counts = content.count_content()
    recent_tests = content.list_content("tests")[:5]
    recent_news = content.list_content("news")[:5]
    return templates.TemplateResponse(
        request,
        "dashboard.html",
        {
            "counts": counts,
            "recent_tests": recent_tests,
            "recent_news": recent_news,
            "content_types": CONTENT_TYPES,
        },
    )


@router.get("/list/{content_type}", response_class=HTMLResponse)
async def list_page(request: Request, content_type: str) -> HTMLResponse:
    if content_type not in CONTENT_TYPES:
        return RedirectResponse(url="/cms/", status_code=303)
    items = content.list_content(content_type)
    meta = CONTENT_TYPES[content_type]
    return templates.TemplateResponse(
        request,
        "list.html",
        {
            "content_type": content_type,
            "items": items,
            "meta": meta,
        },
    )


@router.get("/new/{content_type}", response_class=HTMLResponse)
async def new_editor(request: Request, content_type: str) -> HTMLResponse:
    if content_type not in CONTENT_TYPES:
        return RedirectResponse(url="/cms/", status_code=303)
    meta = CONTENT_TYPES[content_type]
    return templates.TemplateResponse(
        request,
        "editor.html",
        {
            "content_type": content_type,
            "meta": meta,
            "item": None,
            "is_new": True,
        },
    )


@router.get("/edit/{content_type}/{slug}", response_class=HTMLResponse)
async def edit_editor(request: Request, content_type: str, slug: str) -> HTMLResponse:
    if content_type not in CONTENT_TYPES:
        return RedirectResponse(url="/cms/", status_code=303)
    item = content.read_content(content_type, slug)
    if not item:
        return RedirectResponse(url=f"/cms/list/{content_type}", status_code=303)
    meta = CONTENT_TYPES[content_type]
    fm = item["frontmatter"]
    return templates.TemplateResponse(
        request,
        "editor.html",
        {
            "content_type": content_type,
            "meta": meta,
            "item": {
                "slug": slug,
                "title": fm.get("title", ""),
                "brand": fm.get("brand", ""),
                "model": fm.get("model", ""),
                "year": fm.get("year", ""),
                "body": item["body"],
                "engine": fm.get("engine", ""),
                "power": fm.get("power", ""),
                "gearbox": fm.get("gearbox", ""),
                "drivetrain": fm.get("drivetrain", ""),
                "bodyType": fm.get("bodyType", ""),
                "rating": fm.get("rating", ""),
                "sourceName": fm.get("sourceName", ""),
                "sourceUrl": fm.get("sourceUrl", ""),
                "aiAssisted": fm.get("aiAssisted", True),
            },
            "is_new": False,
        },
    )
