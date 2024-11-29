from datetime import datetime
from django.conf import settings
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from auth.tokens import MultiFactorAuthToken

def get_login_data(user):
    token:RefreshToken = RefreshToken.for_user(user)
    data = {
        'token': str(token.access_token),
        'stage': 'authenticated'
    }
    cookie = {
        'key': 'refresh',
        'value': str(token),
        'expires': datetime.now() + settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'],
        'secure': False,
        'httponly': True,
        'samesite': 'Lax'
    }
    return data, cookie


def get_login_response(user):
    data, cookie = get_login_data(user)
    res = Response(data)
    res.set_cookie(**cookie)
    return res


def get_mfa_data(user):
    active_2fa = user.get_active_2fa()
    active_arr = list(active_2fa.values())
    
    if active_arr.count(True): # there is an active 2fa device
        token = MultiFactorAuthToken.for_user(user)
        token['name'] = f'{user.first_name} {user.last_name}'
        token['email'] = user.email
        token['username'] = user.username
        data = {
            'token': str(token),
            'methods': active_2fa
        }
        return (True, data)
    
    return (False, None)

