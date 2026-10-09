"""Shared helper for treating a timezone-naive datetime read from the
database as UTC.

A plain (non-timezone) `DateTime` column always stores and is always
written to with a naive-but-implicitly-UTC value (`datetime.utcnow()`, see
`app.models`'s column docstrings) -- but what a driver hands back for the
very same column can differ by backend: SQLite always returns a naive
`datetime`; a Postgres driver can return either a naive or a tz-aware one
depending on the column/session configuration. Comparing a naive value
against an aware one raises `TypeError`, and silently treating a naive value
as local time (rather than UTC) produces a wrong answer that happens to look
right in whichever timezone the developer is in.

`ensure_utc` is the single place that ambiguity is resolved: every piece of
code that reads one of these columns for a comparison or for serialisation
goes through this helper, so SQLite and Postgres behave identically
(session expiry/idle checks in `app.routers.auth`; chat-history date
grouping and timestamp serialisation in `app.schemas`).
"""

import datetime

__all__ = ["ensure_utc"]


def ensure_utc(value: datetime.datetime) -> datetime.datetime:
    """Return `value` as a timezone-aware UTC datetime.

    A naive value is assumed to already be UTC (never local time) and is
    simply given that timezone; an aware value is converted to UTC. Either
    way, the result is always safe to compare against another value that
    has also been through this helper, regardless of which backend produced
    the original naive/aware value.
    """
    if value.tzinfo is None:
        return value.replace(tzinfo=datetime.UTC)
    return value.astimezone(datetime.UTC)
