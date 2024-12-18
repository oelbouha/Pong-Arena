"""
URL configuration for userManagment project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
# from django.contrib import admin
from django.urls import path, include

from rest_framework.schemas import get_schema_view
from rest_framework.renderers import JSONOpenAPIRenderer
from django.urls import path

schema_view = get_schema_view(
    title="Server Monitoring API",
    url="/api/management/",
    renderer_classes=[JSONOpenAPIRenderer],
)


urlpatterns = [
    path('', include('users.urls')),
    path('', include('friends.urls')),
    path('', include('tournaments.urls')),
    path('', include('game.urls')),
    path("schema.json", schema_view)
]
