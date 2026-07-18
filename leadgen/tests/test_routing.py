"""Insurance routing rules — path A (affiliate) vs path B (OFWCA)."""

from __future__ import annotations

from unittest.mock import patch

from leadgen.config import settings
from leadgen.routers.insurance import InsuranceContext, _resolve_path


def test_ofwca_inactive_always_path_a() -> None:
    with patch.object(settings, "ofwca_active", False):
        cases = [
            InsuranceContext(new_car=True),
            InsuranceContext(after_lease_calc=True),
            InsuranceContext(new_car=True, after_lease_calc=True),
        ]
        for ctx in cases:
            path, _ = _resolve_path(ctx)
            assert path == "A", f"Expected A for {ctx.model_dump()}"


def test_used_car_path_a() -> None:
    with patch.object(settings, "ofwca_active", True):
        path, _ = _resolve_path(InsuranceContext(used_car=True))
        assert path == "A"


def test_new_car_ofwca_active_path_b() -> None:
    with patch.object(settings, "ofwca_active", True):
        path, _ = _resolve_path(InsuranceContext(new_car=True))
        assert path == "B"


if __name__ == "__main__":
    test_ofwca_inactive_always_path_a()
    test_used_car_path_a()
    test_new_car_ofwca_active_path_b()
    print("ok")
