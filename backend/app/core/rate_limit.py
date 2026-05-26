"""
Centralised slowapi Limiter instance.

Import this module in routes to get the @limiter.limit() decorator.
main.py attaches it to app.state and registers the exception handler.
Keeping it in a dedicated module avoids circular imports between main.py
and the route modules.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
