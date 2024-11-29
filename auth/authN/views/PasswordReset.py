from datetime import datetime
from django.conf import settings
from django.contrib.auth.password_validation import validate_password

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework import serializers, status

from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import RefreshToken

from django_otp.models import GenerateNotAllowed
from django_otp.plugins.otp_email.models import EmailDevice
from django_otp.plugins.otp_static.models import StaticDevice

from auth.authentication import EmailVerificationAuth

from users.models import User

class ResendEmail(APIView):
    def post(self, request:Request):
        if not 'email' in request.data:
            return Response({'email': 'email field is required'})
        
        user = User.objects.filter(email=request.data['email']).first()
        if not user:
            return Response({'email': 'No user with this email was found'}, status=status.HTTP_400_BAD_REQUEST)
        
        email_device = user.emaildevice_set.filter(name='password_reset').first()
        if not email_device:
            email_device = EmailDevice(name="password_reset", user=user)
            
        can, meta = email_device.generate_is_allowed()
        if not can:
            data = { 'message': 'unkown error'}
            if meta['reason'] == GenerateNotAllowed.COOLDOWN_DURATION_PENDING:
                data = { 'locked_until': meta['next_generation_at']}
            return Response(data, status=403)
    
        res = email_device.generate_challenge()
        return Response({ 'status': res })



class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    code = serializers.CharField(required=True)
    password = serializers.CharField(required=True, validators=[validate_password])
    
    def __init__(self, instance=None, data=..., **kwargs):
        super().__init__(instance, data, **kwargs)
        self.user = None
    
    def get_user(self, validated_data):
        if self.user:
            return self.user
        self.user = User.objects.get(email=validated_data['email'])
        return self.user
    
    
    def verify(self, device, code):
        can_verify, reasons = device.verify_is_allowed()
        if not can_verify:
            data = {'detail': 'verification is temporarily locked'}
            if 'locked_until' in reasons:
                data['locked_until'] = reasons['locked_until']
            return (False, data)
            
        verified = device.verify_token(code)
        if not verified:
            return (False, { 'code': 'Invalid Code' })
        return (True, { 'detail': 'Password reset successfully'})
    
    
    def verify_code(self, validated_data):
        user = self.get_user(validated_data)
        if not user:
            return (False, { 'email': 'No user with this email was found' })
        
        email_device:EmailDevice = user.emaildevice_set.filter(name='password_reset').first()
        if email_device:
            verified, data = self.verify(email_device, validated_data['code'])
            if verified:
                email_device.delete()
            return (verified, data)
            
        

        static_device:StaticDevice = user.staticdevice_set.first()
        if static_device:
            return self.verify(static_device, validated_data['code'])
        
        
    def reset_password(self, validated_data):
        user = self.get_user(validated_data)
        user.set_password(validated_data['password'])
        user.save()


class ResetPassword(APIView):
    def post(self, request: Request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        verified, data = serializer.verify_code(serializer.validated_data)
        if not verified:
            return Response(data, status=status.HTTP_400_BAD_REQUEST)
        
        serializer.reset_password(serializer.validated_data)
        return Response({'detail': 'password has been reset successfully'})