from .Login import (
    LoginView,
    LogoutView
)
from .OAuth import (
    OAuthLoginRedir,
    OAuthProviderCallback,
    OAuthSignUpFollowUp
)
from .AccountVerification import (
    VerifyAccount,
    ResendEmail
)
from .Mfa import (
    MFAView,
    AuthenticatorView,
    EmailView,
    EmailResendView,
    StaticCodesView
)

from datetime import datetime
from django.conf import settings

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework import generics
from rest_framework import status


from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from rest_framework_simplejwt.serializers import  TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from django_otp.plugins.otp_email.models import EmailDevice

from auth.tokens import EmailVerificationToken
from users.serializers import RegisterSerializer



class SignUpView(APIView):
    def post(self, request:Request):
        try:
            serializer = RegisterSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data
            user = serializer.create(validated_data)
            token = EmailVerificationToken.for_user(user)
            
            email_device = EmailDevice(name="email_verification", user=user, confirmed=False)
            email_device.generate_challenge()
            
            data = {
                'token': str(token),
                'stage': 'email-verification'
            }
            
            return Response(data)
        
        except TokenError as e:
            raise InvalidToken(e.args[0])



class TokenRefreshView(generics.GenericAPIView):
    serializer_class = TokenRefreshSerializer
    
    def get_refresh_token(self, request: Request):
        if 'refresh' in request._request.COOKIES:
            return RefreshToken(request._request.COOKIES['refresh'])
        
        raise TokenError('no refresh token was found')
    
    def post(self, request: Request, *args, **kwargs) -> Response:
        try:
            refresh = self.get_refresh_token(request)
            refresh.verify()
            serializer = self.serializer_class(data={'refresh': str(refresh)})
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data

            
            data = { 'access': validated_data['access'] }

            res = Response(data, status=status.HTTP_200_OK)
            
            refresh_exp_at = datetime.now() + settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME']
            res.set_cookie(
                'refresh',
                validated_data['refresh'],
                expires=refresh_exp_at,
                secure=False,
                httponly=True,
                samesite='Lax'
            )

            return res
        
        except TokenError as e:
            raise InvalidToken(e.args[0])

import sys
class ChangePassword(APIView):
    authentication_classes=(JWTAuthentication,)
    permission_classes=(IsAuthenticated,)
    
    def post(self, request):
        try:
            print(request.data, file=sys.stderr)
            field = 'old_password'
            password = request.data['old_password']
            field = 'new_password'
            new_password = request.data['new_password']
            
            field = None
            
            user = request.user
            if not user.check_password(password) and not (len(user.password) == 0 and len(password) == 0):
                return Response({'old_password': 'password incorrect'}, status=status.HTTP_400_BAD_REQUEST)
                
            user.set_password(new_password)
            user.save()
            return Response({'detail': 'password changed successfully'})
            
        except Exception:
            if field:
                return Response({field: 'this field is required'}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'detail': 'Unkown error'}, status=status.HTTP_400_BAD_REQUEST)