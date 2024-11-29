from datetime import timedelta

from django.urls import path
from django.core.serializers import serialize, deserialize
from django.conf.urls.static import static
from django.conf import settings
from django.http import JsonResponse

from main.views.Files import UploadFile, PreviewFile, FullFile
from main.views.Notification import ListNotifications
from main.views.Invitation import InvitationView
from main.views.Message import get_messages, OnlineFriends

from main import redis_instance

from main.models.Message import StatusChoices


import secrets
import sys

def get_ticket(request):
    ticket = secrets.token_hex(16)
    redis_instance.set(
        f'ticket:{ticket}',
        serialize('json', [request.user], fields=['id', 'username', 'email']),
        ex=timedelta(minutes=10)
    )
    return JsonResponse({'ticket': ticket})



def get_conversations(request):
    conversations = request.user.conversations()
    formatted = [{
            'user': c.user1.get_formatted() if c.user2.id == request.user.id else c.user2.get_formatted(),
            'last_msg': c.formatted_last_msg(),
            'unseen_msgs': False if not c.last_recieved_msg_status else c.last_recieved_msg_status != StatusChoices.SEEN
        } for c in conversations]
    print(formatted, file=sys.stderr)
    return JsonResponse(formatted, safe=False)



urlpatterns = [
    path('ticket/', get_ticket, name="ticket"),
    path('upload/', UploadFile.as_view(), name="upload"),
    path('message/<int:id>/preview/', PreviewFile.as_view(), name="preview"),
    path('message/<int:id>/full/', FullFile.as_view(), name="full"),
    path('messages/<int:id>/', get_messages), # TODO change this with Message view class
    path('conversations/', get_conversations), # TODO change this with Message view class

    path('notifications/', ListNotifications.as_view(), name="list notifications"),
    path('invitation/<int:id>/', InvitationView.as_view(), name="invitation"),
    path('online/', OnlineFriends.as_view(), name="online")
]


if settings.DEBUG: 
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)