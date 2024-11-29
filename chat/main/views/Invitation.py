from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import HttpRequest, JsonResponse
from main.models import Invitation, InvitationStatusChoices, Message, TypeChoices

from main import redis_instance

import json

class InvitationView(LoginRequiredMixin, View):

    def post(self, request: HttpRequest, **kwargs):
        content = {}
        try:
            id = kwargs['id']
            message = Message.objects.get(id=id)
            action = request.POST['action']

            message_content = json.loads(message.content)

            invitation = redis_instance.get(f"invitation:{message_content['invitation']}")
            if invitation is None:
                content["detail"] = "invitation expired"
                message_content['status'] = InvitationStatusChoices.EXPIRED
        
            if message.type != TypeChoices.INVITATION:
                content["detail"] = "the message must be an invitation"
                return JsonResponse(content, status=400)

            if action == "accept":
                content["detail"] = "invitation accepted"
                message_content['status'] = InvitationStatusChoices.ACCEPTED
    
            elif action == "deny":
                content["detail"] = "invitation denied"
                redis_instance.delete(f"invitation:{message_content['invitation']}")
                message_content['status'] = InvitationStatusChoices.DENIED
            else:
                content["detail"] = "invalid action"
                return JsonResponse(content, status=400)
            
            message.content = json.dumps(message_content)
            message.save()
            return JsonResponse(content)

        except Message.DoesNotExist:
            content["detail"] = "message not found"
            return JsonResponse(content, status=404)

        except KeyError:
            content["detail"] = "invalid action"
            return JsonResponse(content, status=400)
        
        except Exception:
            content["detail"] = "server error, please try later"
            return JsonResponse(content, status=500)




