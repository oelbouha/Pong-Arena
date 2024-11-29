from django.urls import path, include

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from rest_framework_simplejwt.authentication import JWTAuthentication

from users.models import User

class Me(APIView):
    authentication_classes=(JWTAuthentication,)
    permission_classes=(IsAuthenticated,)
    
    def get(self, request):
        user:User = request.user
        
        data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'devices': user.get_active_2fa()
        }
        
        return Response(data)


urlpatterns = [
    path('', include('authN.urls')),
    path('me/', Me.as_view())
]
