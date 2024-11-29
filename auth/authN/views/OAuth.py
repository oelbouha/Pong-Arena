from django.http import JsonResponse, HttpResponseRedirect
from django.shortcuts import render
from django.views import View
from authlib.integrations.django_client import OAuth
from requests.models import Response
from django.http import HttpRequest

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response as APIResponse

from auth.authentication import OAuthSingupFollowUpAuth

from users.models import User
from users.serializers import SocialRegisterSerializer

from django.conf import settings

from auth.tokens import OAuthPartialSignUpToken
from .Common import get_mfa_data, get_login_data, get_login_response

import sys

oauth = OAuth()
for name, client_config in settings.AUTHLIB_OAUTH_CLIENTS.items():
    oauth.register(name, **client_config)



class OAuthLoginRedir(View):
    def get(self, request:HttpRequest, **kwargs):
        print(type(request), request.headers, file=sys.stderr)
        try:
            provider = kwargs['provider']
            action = kwargs['action']
            provider_client = oauth.create_client(provider)
            redirect_uri = request.build_absolute_uri(f'/api/auth/{provider}/{action}/callback/')
            ret:HttpResponseRedirect = provider_client.authorize_redirect(request, redirect_uri)
            return JsonResponse({ 'url': ret.url })
        except KeyError:
            return HttpResponseRedirect('/')


class OAuthCallbacks:
    @staticmethod
    def get(provider, action):
        try:
            return getattr(OAuthCallbacks, f'{provider}_{action}')
        except AttributeError:
            return None
        
    @staticmethod
    def sign_up_user_response(request, user):
        dbuser = User.objects.filter(email=user['email']).first()
        if dbuser:
            return OAuthCallbacks.login_response(request, dbuser)
        
        serializer = SocialRegisterSerializer(data=user)
        valid = serializer.is_valid()
        
        if valid:
            user = serializer.create(serializer.validated_data)
            _, cookie = get_login_data(user)
        
            res = render(request, 'oauth_login.html', { 'stage': 'authenticated' })
            res.set_cookie(**cookie)
            return res
        
        token = OAuthPartialSignUpToken()
        token.payload.update(user)
        context = {
            'stage': 'oauth-follow',
            'data': {
                'token': str(token)
            }
        }
        return render(request, 'oauth_login.html', context)
    
    @staticmethod
    def login_response(request, user):
        has_mfa, data = get_mfa_data(user)
        if has_mfa:
            context = {
                'stage': 'mfa',
                'data': data
            }
            return render(request, 'oauth_login.html', context)
        
        _, cookie = get_login_data(user)
        res = render(request, 'oauth_login.html', { 'stage': 'authenticated' })
        res.set_cookie(**cookie)
        return res
    
    
    @staticmethod
    def login_by_email(request, email):
        user = User.objects.filter(email=email).first()
        if user is not None:
            return OAuthCallbacks.login_response(request, user)
        
        context = {
            'stage': 'unauthenticated',
            'data': {
                'reason': 'user not found'
            }
        }
        return render(request, 'oauth_login.html', context)
    
    
    @staticmethod
    def intra_login(request, user_data=None, client=None):
        email = user_data['email']
        return OAuthCallbacks.login_by_email(request, email)
    
    @staticmethod
    def intra_signup(request, user_data=None, client=None):        
        user = {
            'username': user_data['login'],
            'email': user_data['email'],
            'first_name': user_data['first_name'],
            'last_name': user_data['last_name'],
            'picture': user_data['image']['link'],
            'provider': 'intra'
        }
        return OAuthCallbacks.sign_up_user_response(request, user)
    
    
    @staticmethod
    def google_login(request, user_data=None, client=None):
        email = user_data['email']
        return OAuthCallbacks.login_by_email(request, email)
    
    @staticmethod
    def google_signup(request, user_data=None, client=None):
        user = {
            'email': user_data['email'],
            'first_name': user_data['given_name'],
            'last_name': user_data['family_name'],
            'picture': user_data['picture'],
            'provider': 'google'
        }
        token = OAuthPartialSignUpToken()
        token.payload.update(user)
        context = {
            'stage': 'oauth-follow',
            'data': {
                'token': str(token)
            }
        }
        return render(request, 'oauth_login.html', context)




class OAuthProviderCallback(View):
    def get(self, request, **kwargs):
        try:
            provider = kwargs['provider']
            action = kwargs['action'] # login or logout
        
            provider_client = oauth.create_client(provider)
            token = provider_client.authorize_access_token(request)
            resp = provider_client.get(provider_client.client_kwargs['userinfo_endpoint'], token=token)
            resp.raise_for_status()
            request.session.flush()
            user_data = resp.json()
            callback = OAuthCallbacks.get(provider, action)
            return callback(request, user_data, provider_client)
        
        except Exception as e:
            # raise e
            context = {
                'stage': "unauthenticated",
                'data': {
                    'reason': str(e.args[0])
                }
            }
            return render(request, 'oauth_login.html', context)



class OAuthSignUpFollowUp(APIView):
    
    def post(self, request):
        try:
            token = OAuthSingupFollowUpAuth.get_token(request)
            
            if token is None:
                return Response(
                    { 'detail': 'user is not authenticated' },
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            data = {
                'username': token['username'] if 'username' in token else '',
                'email': token['email'] if 'email' in token else '',
                'first_name': token['first_name'] if 'first_name' in token else '',
                'last_name': token['last_name'] if 'last_name' in token else ''
            }
            data.update(request.data)
            serializer = SocialRegisterSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            validated_data = serializer.validated_data
            user = serializer.create(validated_data)
            token.blacklist()
            return get_login_response(user)
        
        except Exception as e:
            print(e.args, file=sys.stderr)
            raise e
            # raise InvalidToken(e.args[0])

