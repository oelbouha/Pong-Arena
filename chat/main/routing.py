# chat/routing.py
from django.urls import path

from .consumers import Chat

websocket_urlpatterns = [
    path("room/<ticket>/", Chat.as_asgi()),
]
    # path("ws/room/<int:ticket>/", Chat.as_asgi()),