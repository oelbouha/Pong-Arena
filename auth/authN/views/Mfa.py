
from rest_framework.views import APIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed

from django_otp.models import Device, GenerateNotAllowed
from django_otp.plugins.otp_totp.models import TOTPDevice
from django_otp.plugins.otp_email.models import EmailDevice
from django_otp.plugins.otp_static.models import StaticDevice, StaticToken


from auth.authentication import MultiFactorAuth, MultiFactorAuthentication
from .Common import get_login_response

import segno

"""
multifactor authentication class responsible for verifying codes
"""
class MFAView(APIView):
     def post(self, request: Request):
        try:
            if not 'code' in request.data:
                return Response({ 'code': 'code is required'}, status=400)
            if not 'method' in request.data:
                return Response({ 'method': 'method is required'}, status=400)
            
            code = request.data['code']
            method = request.data['method']
    
            user, token = MultiFactorAuth.authenticate(request)
            
            device_set = getattr(user, f'{method}device_set')
            device = device_set.filter(name='mfa', confirmed=True).first()
            
            if not device:
                return Response({ 'mfa': f'{method} 2fa is active'}, status=400)
            
            can_verify, reason = device.verify_is_allowed()
            if not can_verify:
                data = {'detail': 'Unkown error'}
                if 'locked_until' in reason:
                    data['detail'] = 'verification is locked temporarily'
                    data['locked_until'] = reason['locked_until']
                    
                return Response(data, status = status.HTTP_400_BAD_REQUEST)
            
            if not device.verify_token(code):
                can_verify, reason = device.verify_is_allowed()
                data = { 'code': 'This code is invalid'}
                if not can_verify and 'locked_until' in reason:
                        data['locked_until'] = reason['locked_until']
                return Response(data, status=400)
            
            token.blacklist()
            return get_login_response(user)
            
        except AuthenticationFailed:
            return Response({}, status=401)


def remove_mfa_device(request, device:Device):
    user = request.user
    
    if not device or not device.confirmed:
        return Response({ 'detail': 'mfa device is not active' }, status=status.HTTP_400_BAD_REQUEST)
    
    can_verify, reason = device.verify_is_allowed()
    if not can_verify:
        data = {'detail': 'Unkown error'}
        if 'locked_until' in reason:
            data['detail'] = 'verification is locked temporarily'
            data['locked_until'] = reason['locked_until']
            
        return Response(data, status = status.HTTP_400_BAD_REQUEST)
    
    if user.password:
        if not 'password' in request.data:
            return Response({ 'password': 'this is required' }, status=status.HTTP_400_BAD_REQUEST)

        if not user.check_password(request.data['password']):
            device.throttle_increment()
            data = { 'password': 'password incorrect' }
            can_verify, reason = device.verify_is_allowed()
            if not can_verify and 'locked_until' in reason:
                data['locked_until'] = reason['locked_until']
            return Response(data, status=status.HTTP_400_BAD_REQUEST)
        
    device.delete()
    return Response({'detail': 'authenticator has been deactivated'}, status=status.HTTP_200_OK)


class AuthenticatorView(APIView):
    authentication_classes=(JWTAuthentication,)
    permission_classes=(IsAuthenticated,)
    
    def get(self, request:Request):
        user = request.user
        device = user.totpdevice_set.first()
        
        if not device:
            device = TOTPDevice(name='mfa', user=user, confirmed=False)
            device.save()
            
        if device.confirmed:
            return Response({ 'detail': 'user already has authenticator 2fa activated' }, status=status.HTTP_400_BAD_REQUEST)
        
        conf_url = device.config_url
        img = segno.make_qr(conf_url)
        return Response({ 'qrcode': img.svg_data_uri() })
    
    
    def activate(self, request):
        code = request.data['code'] if 'code' in request.data else None
        if not code:
            return Response({'code': 'This field is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = request.user
        device:TOTPDevice = user.totpdevice_set.first()
        
        if not device:
            return Response({ 'detail': 'Authenticator 2fa was not initiated properly' }, status.HTTP_400_BAD_REQUEST)
        
        can_verify, reason = device.verify_is_allowed()
        if not can_verify:
            data = {'detail': 'Unkown error'}
            if 'locked_until' in reason:
                data['detail'] = 'verification is locked temporarily'
                data['locked_until'] = reason['locked_until']
                
            return Response(data, status = status.HTTP_400_BAD_REQUEST)
        
        
        verified = device.verify_token(code)
        if not verified:
            data = { 'code': 'Invalid code' }
            can_verify, reason = device.verify_is_allowed()
            if not can_verify and 'locked_until' in reason:
                data['locked_until'] = reason['locked_until']
                
            return Response(data, status=status.HTTP_400_BAD_REQUEST)
            
        device.confirmed = True
        device.save()
        return Response({'detail': 'Authenticator 2fa has been activated'})
    
    
    def deactivate(self, request):
        device:TOTPDevice = request.user.totpdevice_set.filter(name='mfa').first()
        return remove_mfa_device(request, device)
    
    
    def post(self, request:Request):
        if not 'action' in request.data:
            return Response({ 'detail': 'Action is required' }, status=status.HTTP_400_BAD_REQUEST)
        
        action = request.data['action']
        if action == 'activate':
            return self.activate(request)
        elif action == 'deactivate':        
            return self.deactivate(request)
        
        return Response({ 'detail': 'Invalid action' }, status=status.HTTP_400_BAD_REQUEST)
   


class EmailView(APIView):
    authentication_classes=(JWTAuthentication,)
    permission_classes=(IsAuthenticated,)
    
    
    def activate(self, request):
        code = request.data['code'] if 'code' in request.data else None
        if not code:
            return Response({'code': 'This field is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = request.user
        device:EmailDevice = user.emaildevice_set.filter(name='mfa', confirmed=False).first()
        
        if not device:
            return Response({ 'detail': 'Email 2fa was not initiated properly' }, status.HTTP_400_BAD_REQUEST)
        
        can_verify, reason = device.verify_is_allowed()
        if not can_verify:
            data = {'detail': 'Unkown error'}
            if 'locked_until' in reason:
                data['detail'] = 'verification is locked temporarily'
                data['locked_until'] = reason['locked_until']
                
            return Response(data, status = status.HTTP_400_BAD_REQUEST)
        
        
        verified = device.verify_token(code)
        if not verified:
            data = { 'code': 'Invalid code' }
            can_verify, reason = device.verify_is_allowed()
            if not can_verify and 'locked_until' in reason:
                data['locked_until'] = reason['locked_until']
                
            return Response(data, status=status.HTTP_400_BAD_REQUEST)
            
        device.confirmed = True
        device.save()
        return Response({'detail': 'Authenticator 2fa has been activated'})
    
    
    def deactivate(self, request):
        device:TOTPDevice = request.user.emaildevice_set.filter(name='mfa', confirmed=True).first()
        return remove_mfa_device(request, device)
    
    
    def resend(self, request):
        user = request.user
        
        device:EmailDevice = user.emaildevice_set.filter(name='mfa', confirmed=False).first()
        if not device:
            device = EmailDevice(user=user, name='mfa', confirmed=False)
            
        can, meta = device.generate_is_allowed()
        if not can:
            data = { 'message': 'unkown error'}
            if meta['reason'] == GenerateNotAllowed.COOLDOWN_DURATION_PENDING:
                data = { 'locked_until': meta['next_generation_at']}
            return Response(data, status=status.HTTP_400_BAD_REQUEST)
        
        res = device.generate_challenge()
        return Response({ 'status': res })
    
    
    def post(self, request:Request):
        if not 'action' in request.data:
            return Response({ 'detail': 'Action is required' }, status=status.HTTP_400_BAD_REQUEST)
        
        action = request.data['action']
        if action == 'activate':
            return self.activate(request)
        elif action == 'deactivate':        
            return self.deactivate(request)
        elif action == 'resend':
            return self.resend(request)
        
        return Response({ 'detail': 'Invalid action' }, status=status.HTTP_400_BAD_REQUEST)
   


class EmailResendView(APIView):
    authentication_classes=(MultiFactorAuthentication,)
    permission_classes=(IsAuthenticated,)
    
    def post(self, request):
        user = request.user
        
        device:EmailDevice = user.emaildevice_set.filter(name='mfa', confirmed=True).first()
        if not device:
            return Response({'detail': 'Email 2fa is not activated for this account'}, status=status.HTTP_403_FORBIDDEN)
            
        can, meta = device.generate_is_allowed()
        if not can:
            data = { 'message': 'unkown error'}
            if meta['reason'] == GenerateNotAllowed.COOLDOWN_DURATION_PENDING:
                data = { 'locked_until': meta['next_generation_at']}
            return Response(data, status=status.HTTP_400_BAD_REQUEST)
        
        res = device.generate_challenge()
        return Response({ 'status': res })
    
    

class StaticCodesView(APIView):
    authentication_classes=(JWTAuthentication,)
    permission_classes=(IsAuthenticated,)
    
    def get(self, request):
        user = request.user
        device = user.staticdevice_set.filter(name='mfa', confirmed=True).first()
        if not device:
            return Response({ 'detail': 'static codes is inactive'}, status = status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'tokens': [ tkn.token for tkn in device.token_set.all() ]
        })
    
    
    def activate(self, request:Request):
        user = request.user
        device = user.staticdevice_set.filter(name='mfa').first()
        
        if not device:
            device = StaticDevice(name="mfa", user=user, confirmed=False)
            device.save()
        
        if device.confirmed:
            return Response({ 'static codes': 'Already active' }, status=status.HTTP_400_BAD_REQUEST)
        
        can_verify, reason = device.verify_is_allowed()
        if not can_verify:
            data = {'detail': 'Unkown error'}
            if 'locked_until' in reason:
                data['detail'] = 'verification is locked temporarily'
                data['locked_until'] = reason['locked_until']
                
            return Response(data, status = status.HTTP_400_BAD_REQUEST)
        
        if user.password:
            if not 'password' in request.data:
                return Response({ 'password': 'this is required' }, status=status.HTTP_400_BAD_REQUEST)

            if not user.check_password(request.data['password']):
                device.throttle_increment()
                data = { 'password': 'password incorrect' }
                can_verify, reason = device.verify_is_allowed()
                if not can_verify and 'locked_until' in reason:
                    data['locked_until'] = reason['locked_until']
                
                return Response(data, status=status.HTTP_400_BAD_REQUEST)
        
        # create tokens
        device.token_set.bulk_create([
            StaticToken(device=device, token=StaticToken.random_token()) for i in range(10)
        ])
        
        device.confirmed = True
        device.save()
        return Response({
            'detail': 'static codes 2fa has been activated',
            'tokens': [ tkn.token for tkn in device.token_set.all() ]
        })


    def deactivate(self, request:Request):
        device:TOTPDevice = request.user.staticdevice_set.filter(name='mfa').first()
        return remove_mfa_device(request, device)


    def regenerate(self, request:Request):
        user = request.user
        device = user.staticdevice_set.filter(name='mfa', confirmed=True).first()
        
        if not device:
            return Response({ 'static_codes': 'Mfa device is not active' })
        
        can_verify, reason = device.verify_is_allowed()
        if not can_verify:
            data = {'detail': 'Unkown error'}
            if 'locked_until' in reason:
                data['detail'] = 'verification is locked temporarily'
                data['locked_until'] = reason['locked_until']
                
            return Response(data, status = status.HTTP_400_BAD_REQUEST)
        
        if user.password:
            if not 'password' in request.data:
                return Response({ 'password': 'this is required' }, status=status.HTTP_400_BAD_REQUEST)

            if not user.check_password(request.data['password']):
                device.throttle_increment()
                data = { 'password': 'password incorrect' }
                can_verify, reason = device.verify_is_allowed()
                if not can_verify and 'locked_until' in reason:
                    data['locked_until'] = reason['locked_until']
                
                return Response(data, status=status.HTTP_400_BAD_REQUEST)
        
        device.token_set.all().delete()
        device.token_set.bulk_create([
            StaticToken(device=device, token=StaticToken.random_token()) for i in range(10)
        ])
        
        return Response({
            'detail': 'static codes 2fa has been regenrated',
            'tokens': [ tkn.token for tkn in device.token_set.all() ]
        })

    def post(self, request:Request):
        if not 'action' in request.data:
            return Response({ 'detail': 'Action is required' }, status=status.HTTP_400_BAD_REQUEST)
        
        action = request.data['action']
        if action == 'activate':
            return self.activate(request)
        elif action == 'deactivate':        
            return self.deactivate(request)
        elif action == 'regenerate':
            return self.regenerate(request)
        
        return Response({ 'detail': 'Invalid action' }, status=status.HTTP_400_BAD_REQUEST)
        
            