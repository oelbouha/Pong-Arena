from datetime import datetime, timedelta

from rest_framework import status

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.exceptions import ValidationError


from rest_framework_simplejwt.exceptions import TokenError, InvalidToken, AuthenticationFailed
from rest_framework_simplejwt.tokens import RefreshToken

from auth.tokens import EmailVerificationToken, MultiFactorAuthToken
from users.serializers import LoginSerializer

from .Common import get_login_response




class LoginView(APIView):
    authentication_classes = ()
    def post(self, request:Request):
        try:
            serializer = LoginSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            authenticated, user = serializer.authenticate()
            if not authenticated:
                return Response({"detail":"No active account found with the given credentials"}, status=401)

            
            if not user.verified:
                token = EmailVerificationToken.for_user(user)
                data = {
                    'token': str(token),
                    'stage': 'email-verification'
                }
                return Response(data)
            
            active_2fa = user.get_active_2fa()
            active_arr = list(active_2fa.values())
            
            if active_arr.count(True): # there is an active 2fa device
                token = MultiFactorAuthToken.for_user(user)
                data = {
                    'token': str(token),
                    'stage': 'mfa',
                    'methods': active_2fa
                }
                return Response(data)
            
            return get_login_response(user)
        
        except TokenError as e:
            raise InvalidToken(e.args[0])
        except ValidationError:
            return Response({"detail":serializer.errors}, status=401)



class LogoutView(APIView):
    def post(self, request: Request):
        res = Response({}, status=status.HTTP_205_RESET_CONTENT)
        res.set_cookie('refresh', '', expires=datetime.now() - timedelta(minutes=1))
        if 'refresh' in request._request.COOKIES:
            refresh = RefreshToken(request._request.COOKIES['refresh'])
            refresh.blacklist()
        return res


