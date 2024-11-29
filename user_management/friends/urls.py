from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FriendRequestViewSet, FriendshipViewSet

router = DefaultRouter()
router.register(r'friend-requests', FriendRequestViewSet, basename='friend-requests')
router.register(r'friendships', FriendshipViewSet, basename='friendships')

urlpatterns = [
    path('', include(router.urls)),
]