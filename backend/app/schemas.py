"""Pydantic request and response models.

One pair per entity in the approved data model, plus the placeholder every
generated route returns until it has been implemented.
"""

from pydantic import BaseModel

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

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    """A plain success acknowledgement, e.g. for logout."""

    detail: str


class StubResponse(BaseModel):
    """What a generated route returns until someone implements it.

    A stub that returns a typed body rather than raising keeps the service
    startable and its OpenAPI document complete, so the frontend can be built
    against the agreed shape while the handlers are still being written.
    """

    endpoint: str
    status: str = "not_implemented"
    detail: str = "Scaffolded from the approved API spec; no behaviour yet."
