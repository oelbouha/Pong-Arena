import os
import re
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'game.settings')
django_asgi_app = get_asgi_application()


from django.urls import path
from django.contrib.auth.models import AnonymousUser
from django.core.serializers import deserialize

from channels.routing import ProtocolTypeRouter, URLRouter

from main.consumers import redis_instance
from main.consumers.HandSlap import HandSlapConsumer
from main.consumers.PingPong import PingPongConsumer


async def get_user(ticket):
    serialized_user = await redis_instance.get(f'ticket:{ticket}')
    if serialized_user is None:
        return AnonymousUser()
    await redis_instance.expire(f'ticket:{ticket}', 0)
    user_gen = deserialize('json', serialized_user)
    return next(user_gen).object


class CustomAuthMiddleware:
    def __init__(self, app):
        self.app = app
        self.pattern = re.compile(r"^/(pong|slap)/(?P<ticket>[\w]+)")

    async def __call__(self, scope, receive, send):
        match = self.pattern.search(scope['path'])
        scope['user'] = await get_user(match['ticket'])

        return await self.app(scope, receive, send)



application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": CustomAuthMiddleware(
            URLRouter([
                path("pong/<ticket>/", PingPongConsumer.as_asgi()),
                path("slap/<ticket>/", HandSlapConsumer.as_asgi()),
            ])
    ),
})