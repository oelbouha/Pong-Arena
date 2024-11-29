from django.urls import path, re_path
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from .views import (
    LoginView,
    SignUpView,
    LogoutView,
    OAuthLoginRedir,
    OAuthProviderCallback,
    OAuthSignUpFollowUp,
    TokenRefreshView,
    VerifyAccount,
    ResendEmail,
    MFAView,
    AuthenticatorView,
    EmailView,
    EmailResendView,
    StaticCodesView,
    ChangePassword
)

from .views.PasswordReset import ResendEmail as ResendResetEmail
from .views.PasswordReset import ResetPassword


class Verify(APIView):
    authentication_classes = (JWTAuthentication,)
    permission_classes = (IsAuthenticated,)
    
    def user_id(self, request):
        res = Response()
        res['X-USER-ID'] = request.user.id
        return res
        
    
    def get(self, request):
        return self.user_id(request)
    
    def post(self, request):
        return self.user_id(request)


urlpatterns = [
    path('verify/', Verify.as_view(), name='verify'),
    path('signup/', SignUpView.as_view(), name="signup"),
    path('login/', LoginView.as_view(), name='login'),
    re_path(r'^(?P<provider>[\w-]+)/(?P<action>login|signup)/$', OAuthLoginRedir.as_view(), name='oauth_redir'),
    re_path(r'^(?P<provider>[\w-]+)/(?P<action>login|signup)/callback/$', OAuthProviderCallback.as_view(), name='intra_callback'),
    path('signup/oauth-follow-up', OAuthSignUpFollowUp.as_view(), name="oauth-followup"),
    path('logout/', LogoutView.as_view(), name='login'),
    path('login/refresh/', TokenRefreshView.as_view(), name='refresh'),
    path('verify_email/', VerifyAccount.as_view(), name='verify_email'),
    path('resend_verification_email/', ResendEmail.as_view(), name='resend_verification'),
    path('mfa/', MFAView.as_view(), name='mfa_verify'),
    path('mfa/authenticator/', AuthenticatorView.as_view(), name='mfa_authenticator'),
    path('mfa/email/', EmailView.as_view(), name='mfa_email'),
    path('mfa/email/resend/', EmailResendView.as_view(), name='mfa_email_resend'),
    path('mfa/static_codes/', StaticCodesView.as_view(), name='mfa_static_codes'),
    path('change_password/', ChangePassword.as_view(), name="change_password"),
    path('reset_password/', ResetPassword.as_view(), name="reset_password"),
    path('reset_password/send_email/', ResendResetEmail.as_view(), name='resend_reset_email')
]
