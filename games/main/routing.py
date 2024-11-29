# chat/routing.py
from django.urls import path



from main.consumers.HandSlap import HandSlapConsumer
from main.consumers.PingPong import PingPongConsumer

websocket_urlpatterns = [
    path("pong/match/", PingPongConsumer.as_asgi()),
    path("slap/match/", HandSlapConsumer.as_asgi()),
]
