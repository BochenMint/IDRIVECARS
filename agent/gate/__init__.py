"""Editorial gate package."""

from gate.score import score_draft
from gate.telegram import send_draft_for_review

__all__ = ["score_draft", "send_draft_for_review"]
