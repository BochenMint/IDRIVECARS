"""JSON API for save, publish, upload, delete."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel

from cms.auth import check_csrf
from cms.config import CONTENT_TYPES
from cms.services import content, images, publish, seo

router = APIRouter(prefix="/cms/api", tags=["api"])


class SavePayload(BaseModel):
    content_type: str
    existing_slug: str | None = None
    title: str = ""
    brand: str = ""
    model: str = ""
    year: int | None = None
    body: str = ""
    engine: str = ""
    power: str = ""
    gearbox: str = ""
    drivetrain: str = ""
    bodyType: str = ""
    rating: float | None = None
    sourceName: str = ""
    sourceUrl: str = ""
    aiAssisted: bool | None = None
    skip_deploy: bool = False


def _payload_to_dict(payload: SavePayload) -> dict[str, Any]:
    data = payload.model_dump(exclude={"content_type", "existing_slug", "skip_deploy"})
    return {k: v for k, v in data.items() if v is not None and v != ""}


@router.post("/save")
async def api_save(request: Request, payload: SavePayload) -> dict[str, Any]:
    check_csrf(request)
    if payload.content_type not in CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Nieznany typ treści")
    try:
        slug_hint = payload.existing_slug
        image_paths = images.list_gallery_images(slug_hint) if slug_hint else []
        return publish.save_draft(
            _payload_to_dict(payload),
            content_type=payload.content_type,
            existing_slug=payload.existing_slug,
            image_paths=image_paths or None,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/publish")
async def api_publish(request: Request, payload: SavePayload) -> dict[str, Any]:
    check_csrf(request)
    if payload.content_type not in CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Nieznany typ treści")
    try:
        slug_hint = payload.existing_slug
        image_paths = images.list_gallery_images(slug_hint) if slug_hint else []
        return publish.publish(
            _payload_to_dict(payload),
            content_type=payload.content_type,
            existing_slug=payload.existing_slug,
            image_paths=image_paths or None,
            skip_deploy=payload.skip_deploy,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/upload")
async def api_upload(
    request: Request,
    slug: str = Form(...),
    files: list[UploadFile] = File(...),
) -> dict[str, Any]:
    check_csrf(request)
    if not slug.strip():
        raise HTTPException(status_code=400, detail="Brak slug")
    paths: list[str] = []
    for upload in files:
        data = await upload.read()
        try:
            path = images.save_upload(slug, upload.filename or "image.jpg", data)
            paths.append(path)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    images.update_manifest_entry(slug)
    return {"ok": True, "paths": paths}


@router.post("/seo-preview")
async def api_seo_preview(request: Request) -> dict[str, Any]:
    """Live SEO preview for editor JS."""
    check_csrf(request)
    body = await request.json()
    content_type = body.get("content_type", "tests")
    existing_slug = body.get("existing_slug")
    try:
        enriched = seo.enrich(
            body,
            content_type=content_type,
            existing_slug=existing_slug,
        )
        return {"ok": True, "seo": enriched["seo_preview"], "slug": enriched["slug"]}
    except ValueError as exc:
        return {"ok": False, "error": str(exc)}


@router.delete("/{content_type}/{slug}")
async def api_delete(request: Request, content_type: str, slug: str, gallery: bool = False) -> dict[str, Any]:
    check_csrf(request)
    if content_type not in CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Nieznany typ treści")
    deleted = content.delete_content(content_type, slug, delete_gallery=gallery)
    if gallery:
        images.update_manifest_remove(slug)
    return {"ok": deleted}
