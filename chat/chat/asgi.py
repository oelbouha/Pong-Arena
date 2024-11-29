
import os
import re
import sys

from django.urls import path
from django.contrib.auth.models import AnonymousUser
from django.core.serializers import deserialize
from django.core.asgi import get_asgi_application

from channels.routing import ProtocolTypeRouter, URLRouter

from main import redis_instance
from main.consumers import Chat

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "chat.settings")
django_asgi_app = get_asgi_application()


async def get_user(ticket):
    serialized_user = redis_instance.get(f'ticket:{ticket}')
    if serialized_user is None:
        return AnonymousUser()
    redis_instance.expire(f'ticket:{ticket}', 0)
    user_gen = deserialize('json', serialized_user)
    return next(user_gen).object


class CustomAuthMiddleware:
    def __init__(self, app):
        self.app = app
        self.pattern = re.compile(r"^/room/(?P<ticket>[\w]+)")

    async def __call__(self, scope, receive, send):
        match = self.pattern.search(scope['path'])
        scope['user'] = await get_user(match['ticket'])

        return await self.app(scope, receive, send)


application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": CustomAuthMiddleware(
            URLRouter([
                path("room/<ticket>/", Chat.as_asgi()),
            ]),
        )
    }
)