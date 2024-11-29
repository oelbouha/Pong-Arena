from datetime import timedelta

from django.urls import path
from django.core.serializers import serialize
from django.conf.urls.static import static
from django.http.response import JsonResponse
from django.conf import settings
from main.views.Auth import Home, Login, Logout, UserData
from main.consumers import redis_instance




urlpatterns = [
]
