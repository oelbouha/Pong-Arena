from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import HttpRequest, JsonResponse
from django.conf import settings

from main.models import Notification


class ListNotifications(LoginRequiredMixin, View):
    def update_seen(self, notif):
        notif.seen = True
        return notif

    def get(self, request: HttpRequest):
        try:
            page = int(request.GET['page'])
        except Exception:
            page = 0

        start = page * settings.PAGINATION_LIMIT
        notifications = Notification.objects\
                        .filter(target=request.user)\
                        .order_by('-id')[start:start + settings.PAGINATION_LIMIT]
        data = {
            'page': page + 1, # TODO will be removed
            'notifications': [{
                'content': notification.content,
                'seen': notification.seen
            } for notification in notifications],
        }
        
        seen = [self.update_seen(n) for n in notifications]
        Notification.objects.bulk_update(seen, ['seen'])
        
        return JsonResponse(data)
    
