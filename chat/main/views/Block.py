from django.views import View
from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import HttpRequest, JsonResponse
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from django.db.models import Q

from main.models import Block

User = get_user_model()


class BlockView(LoginRequiredMixin, View):

    def post(self, request: HttpRequest, **kwargs):
        content = {}
        try:
            id = kwargs['id']
            target = User.objects.get(id=id)
            action = request.POST['action']
            if action == "block":
                content["detail"] = "user blocked successfuly"
                self.block(target)
            elif action == "unblock":
                content["detail"] = "user unblocked successfuly"
                self.unblock(target)
            else:
                content["detail"] = "invalid action"
                return JsonResponse(content, status=400)


            return JsonResponse(content)

        except User.DoesNotExist:
            content["detail"] = "user not found"
            return JsonResponse(content, status=404)

        except KeyError:
            content["detail"] = "invalid action"
            return JsonResponse(content, status=400)

        except ValidationError as e:
            content["detail"] = e.message
            return JsonResponse(content, status=400)

        except Exception:
            content["detail"] = "server error, please try later"
            return JsonResponse(content, status=500)


    def block(self, target):
        already_blocked = Block.objects.filter(
            Q(blocker=self.request.user) | Q(blocker=target),
            Q(blocked=self.request.user) | Q(blocked=target)
        )

        if already_blocked.exists():
            raise ValidationError("you can't block this user")
        
        block = Block.objects.create(
            blocker=self.request.user,
            blocked=target
        )


    def unblock(self, target):
            block = Block.objects.filter(
                blocker=self.request.user,
                blocked=target
            )
            if not block.exists():
                raise ValidationError("you can't unblock this user")
            block.delete()


# TODO start testing this