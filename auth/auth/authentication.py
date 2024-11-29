from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from .tokens import EmailVerificationToken, OAuthPartialSignUpToken, MultiFactorAuthToken

import sys


class CustomJWTAuthentication(JWTAuthentication):
    AuthToken = None
    
    def authenticate(self, request):
        return super().authenticate(request._request)
    
    
    
    def get_validated_token(self, raw_token: bytes):
        try:
            return self.AuthToken(raw_token)
        except TokenError as e:
            raise InvalidToken(
                {
                    "detail": "Given token not valid for any token type",
                    "messages": e.args[0],
                }
            )

        
    def get_token(self, request):
        header = self.get_header(request)
        if header is None:
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None

        return self.get_validated_token(raw_token)


EmailVerificationAuth = CustomJWTAuthentication()
EmailVerificationAuth.AuthToken = EmailVerificationToken

OAuthSingupFollowUpAuth = CustomJWTAuthentication()
OAuthSingupFollowUpAuth.AuthToken = OAuthPartialSignUpToken

class MultiFactorAuthentication(CustomJWTAuthentication):
    AuthToken = MultiFactorAuthToken

MultiFactorAuth = CustomJWTAuthentication()
MultiFactorAuth.AuthToken = MultiFactorAuthToken