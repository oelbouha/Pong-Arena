from django.contrib.auth.base_user import AbstractBaseUser
from django.core.exceptions import ImproperlyConfigured
from django.http import HttpRequest
from django.utils.deprecation import MiddlewareMixin
from django.utils.functional import SimpleLazyObject
from django.contrib.auth import get_user_model

from django.contrib.auth.backends import ModelBackend

User = get_user_model()

def get_user(request:HttpRequest):
    user_id = request.headers.get('X-USER-ID')
    if user_id:
        return User.objects.get(id=user_id)
    return None


class AuthenticationMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request.user = SimpleLazyObject(lambda: get_user(request))





class AuthBackend(ModelBackend):
    def authenticate(self, request):
        user = getattr(request._request, 'user', None)
        return (user, None)