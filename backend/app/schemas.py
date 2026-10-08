"""Pydantic request and response models.

One pair per entity in the approved data model, plus the placeholder every
generated route returns until it has been implemented.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, field_validator

# Plain `str` rather than `pydantic.EmailStr`: the latter needs the
# `email-validator` package, which is not an approved new dependency for this
# ticket. Format validation is not an acceptance criterion here.


class LoginRequest(BaseModel):
    """POST /auth/login body."""

    email: str
    password: str


class SignupRequest(BaseModel):
    """POST /auth/signup body."""

    email: str
    password: str


class UserOut(BaseModel):
    """What the API ever says about a user: never the password or its hash."""

    id: str
    email: str
    role: str
    is_enabled: bool
    theme: str

    model_config = {"from_attributes": True}


# Matches the minimum length the Account screen states and enforces
# client-side (AC-079): keep these two in sync if either changes.
PASSWORD_MIN_LENGTH = 12


class ChangePasswordRequest(BaseModel):
    """POST /account/password body."""

    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def _min_length(cls, value: str) -> str:
        if len(value) < PASSWORD_MIN_LENGTH:
            raise ValueError(f"New password must be at least {PASSWORD_MIN_LENGTH} characters")
        return value


class ThemeRequest(BaseModel):
    """PUT /account/theme body."""

    theme: Literal["light", "dark", "system"]


class ConfigOut(BaseModel):
    """GET /auth/config: unauthenticated, lets the sign-in page know whether
    to offer self-service account creation."""

    self_signup_enabled: bool


class UserCreateRequest(BaseModel):
    """POST /users body (admin-only)."""

    email: str
    password: str
    role: Literal["admin", "employee"] = "employee"


class UserUpdateRequest(BaseModel):
    """PATCH /users/{id} body (admin-only). Every field optional; only the
    fields provided are changed."""

    role: Literal["admin", "employee"] | None = None
    is_enabled: bool | None = None
    password: str | None = None


class MessageResponse(BaseModel):
    """A plain success acknowledgement, e.g. for logout."""

    detail: str


class DocumentOut(BaseModel):
    """What POST /documents and GET /documents ever say about a document."""

    id: str
    filename: str
    file_type: str
    size_bytes: int
    status: str
    uploaded_by: str | None
    uploaded_at: datetime

    model_config = {"from_attributes": True}


class StubResponse(BaseModel):
    """What a generated route returns until someone implements it.

    A stub that returns a typed body rather than raising keeps the service
    startable and its OpenAPI document complete, so the frontend can be built
    against the agreed shape while the handlers are still being written.
    """

    endpoint: str
    status: str = "not_implemented"
    detail: str = "Scaffolded from the approved API spec; no behaviour yet."
