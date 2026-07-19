"""Session authentication for the owner CMS."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException, Request, Response
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from cms.config import CMS_PASSWORD, CMS_SECRET, SESSION_COOKIE, SESSION_MAX_AGE

_serializer = URLSafeTimedSerializer(CMS_SECRET, salt="cms-session")


def create_session_token() -> str:
    return _serializer.dumps({"authenticated": True})


def verify_session_token(token: str) -> bool:
    try:
        data = _serializer.loads(token, max_age=SESSION_MAX_AGE)
    except (BadSignature, SignatureExpired):
        return False
    return bool(data.get("authenticated"))


def is_authenticated(request: Request) -> bool:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        return False
    return verify_session_token(token)


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=SESSION_MAX_AGE,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(key=SESSION_COOKIE, path="/")


def verify_password(password: str) -> bool:
    return password == CMS_PASSWORD


def require_auth(request: Request) -> None:
    if not is_authenticated(request):
        raise HTTPException(status_code=401, detail="Wymagane logowanie")


def check_csrf(request: Request) -> None:
    """Reject POST requests with mismatched Origin (same-site cookie complement)."""
    origin = request.headers.get("origin")
    if not origin:
        return
    host = request.headers.get("host", "")
    if not host:
        return
    # Allow localhost and same host
    allowed_hosts = {host, f"http://{host}", f"https://{host}"}
    if origin.rstrip("/") not in {h.rstrip("/") for h in allowed_hosts}:
        raise HTTPException(status_code=403, detail="Nieprawidłowe żądanie (CSRF)")
