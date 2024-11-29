from datetime import datetime
from django.conf import settings

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import status

from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import RefreshToken

from django_otp.models import GenerateNotAllowed
from django_otp.plugins.otp_email.models import EmailDevice

from auth.authentication import EmailVerificationAuth


class ResendEmail(APIView):
    def post(self, request:Request):
        try:
            user, _ = EmailVerificationAuth.authenticate(request)
            email_device = user.emaildevice_set.filter(name='email_verification').first()
            
            if user.verified:
                #TODO: blacklist the refresh token
                return Response({'detail': 'user is already verified'}, status=401)
            if not email_device and not user.verified:
                email_device = EmailDevice(name="email_verification", user=user)
                
            can, meta = email_device.generate_is_allowed()
            if not can:
                data = { 'message': 'unkown error'}
                if meta['reason'] == GenerateNotAllowed.COOLDOWN_DURATION_PENDING:
                    data = { 'cooldown': meta['next_generation_at']}
                return Response(data, status=403)
        
            res = email_device.generate_challenge()
            return Response({ 'status': res })
        except AuthenticationFailed:
            return Response({'detail': 'Token is invalid'}, status=401)
        

class VerifyAccount(APIView):
    def post(self, request: Request):
        try:
            user, token = EmailVerificationAuth.authenticate(request)
            email_device :EmailDevice = user.emaildevice_set.filter(name='email_verification').first()
            
            if not 'code' in request.data:
                return Response({ 'code': 'code is required'}, status=400)
            
            code = request.data['code']
            if not email_device.verify_token(code):
                return Response({ 'code': 'code is invalid'}, status=400)
            
            
            email_device.delete()
            user.verified = True
            user.save()
            token.blacklist()
            
            refreshToken:RefreshToken = RefreshToken.for_user(user)
            refresh_exp_at = datetime.now() + settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME']
            data = { 
                'token': str(refreshToken.access_token),
                'stage': 'authenticated'
            }

            res = Response(data, status=status.HTTP_200_OK)
            res.set_cookie(
                'refresh',
                str(refreshToken),
                expires=refresh_exp_at,
                secure=False,
                httponly=True,
                samesite='Lax'
            )

            return res
            
        except AuthenticationFailed:
            return Response({}, status=401)