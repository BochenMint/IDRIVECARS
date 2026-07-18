"""Application configuration for idrivecars.pl leadgen service."""

from __future__ import annotations

from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

PartnerMode = Literal["redirect", "form"]
PartnerName = Literal["MyLead", "ComperiaLead", "LeadStar"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Feature flags
    ofwca_active: bool = Field(default=False, alias="OFWCA_ACTIVE")

    # Partner routing modes
    partner_mylead_mode: PartnerMode = Field(default="redirect", alias="PARTNER_MYLEAD_MODE")
    partner_comperia_mode: PartnerMode = Field(default="form", alias="PARTNER_COMPERIA_MODE")
    partner_leadstar_mode: PartnerMode = Field(default="redirect", alias="PARTNER_LEADSTAR_MODE")

    # Consent (user-facing PL)
    consent_checkbox_text: str = Field(
        default=(
            "Wyrażam zgodę na przetwarzanie moich danych osobowych w celu kontaktu "
            "w sprawie oferty leasingu/wynajmu oraz ubezpieczenia. Administratorem "
            "danych jest idrivecars.pl. Więcej informacji w polityce prywatności."
        ),
        alias="CONSENT_CHECKBOX_TEXT",
    )

    # CORS
    site_origin: str = Field(default="https://idrivecars.pl", alias="SITE_ORIGIN")
    cors_origins: list[str] = Field(default_factory=lambda: ["https://idrivecars.pl"])

    # Dashboard auth
    dashboard_token: str = Field(default="changeme", alias="DASHBOARD_TOKEN")

    # Database
    database_path: str = Field(default="/workspace/data/idrive.db", alias="DATABASE_PATH")

    # Broker CRM webhook (optional)
    broker_crm_webhook_url: str | None = Field(default=None, alias="BROKER_CRM_WEBHOOK_URL")

    # Insurance affiliates
    insurance_affiliate_base_url: str = Field(
        default="https://partner.example.com/compare",
        alias="INSURANCE_AFFILIATE_BASE_URL",
    )
    insurance_affiliate_partner_id: str = Field(default="idrivecars", alias="INSURANCE_AFFILIATE_PARTNER_ID")

    # OFWCA form (path B)
    ofwca_form_url: str = Field(default="https://idrivecars.pl/ofwca", alias="OFWCA_FORM_URL")

    # Telegram notifications for path B
    telegram_bot_token: str | None = Field(default=None, alias="TELEGRAM_BOT_TOKEN")
    telegram_chat_id: str | None = Field(default=None, alias="TELEGRAM_CHAT_ID")

    def model_post_init(self, __context: object) -> None:
        if self.site_origin and self.site_origin not in self.cors_origins:
            self.cors_origins = [self.site_origin, *self.cors_origins]

    def partner_mode(self, partner: PartnerName) -> PartnerMode:
        mapping: dict[PartnerName, PartnerMode] = {
            "MyLead": self.partner_mylead_mode,
            "ComperiaLead": self.partner_comperia_mode,
            "LeadStar": self.partner_leadstar_mode,
        }
        return mapping[partner]


settings = Settings()
