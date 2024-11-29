from rest_framework_simplejwt.tokens import Token, BlacklistMixin
from django.conf import settings


class EmailVerificationToken(BlacklistMixin, Token):
    token_type = 'email_verification'
    lifetime = settings.EMAIL_VERIFICATION_LIFETIME

class OAuthPartialSignUpToken(BlacklistMixin, Token):
    token_type = 'oauth_partial'
    lifetime = settings.OAUTH_PARTIAL_LIFETIME
    

class MultiFactorAuthToken(BlacklistMixin, Token):
    token_type = 'mfa_auth'
    lifetime = settings.MFA_LIFETIME
    
    