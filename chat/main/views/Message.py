from django.views import View
from django.db.models import Q, Subquery
from django.http import JsonResponse, HttpRequest
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth import get_user_model
from django.core.serializers import serialize



from main.models import Conversation, Friendship
from main.consumers import redis_instance

import json
from main.models import Message


User = get_user_model()

# TODO replace this with the Message class 
def get_messages(request, **kwargs):
	try:
		user1 = request.user
		user2_id = kwargs['id']

		user2 = User.objects.get(id=user2_id)
		messages = Message.get_messages_between_users(user1, user2)

		try:
			if 'last' in request.GET:
				last = int(request.GET['last'])
				messages = messages.filter(
        			time__lt=Subquery(
               			Message.objects
                  			.values_list('time', flat=True)
                     		.filter(id=last)
                  	)
           		)
		except Exception:
			pass

		messages = messages[:50]

		messages_data = [
			{
				"sender": message.sender.id,
				"recipient": message.recipient.id,
				"tp": message.type,
				"status": message.status,
				"time": message.time,
				"cnt": message.content,
				"msg" : message.id

			}
			for message in messages
		]
		return JsonResponse(messages_data, safe=False)
	except User.DoesNotExist:
		return JsonResponse({"message": "Invalid request: user does not exist"})
	except Exception as e:
		return JsonResponse({"message": "Messages data not found", 'err': e.args[0]})




class Messages(LoginRequiredMixin, View):
	# TODO add pagination later
	def get(self, request: HttpRequest, **kwargs):
		try:
			id = kwargs['id']
			conversation = Conversation.objects.get(id=id)
			messages = Message.objects.select_related('sender', 'recipient').filter(conversation=conversation).order_by('id')
			formatted = [
				{
					'msg': message.id,
					'sender': message.sender.id,
					'recipient': message.recipient.id,
					'tp': message.type,
					'status': message.status,
					'time': message.time,
					'cnt': message.content,


				}
				for message in messages
			]

			return JsonResponse(messages, safe=False)

		except Conversation.DoesNotExist:
			return JsonResponse({
				"message": "user not found" 
			}, status=404)
		



class OnlineFriends(LoginRequiredMixin, View):
	def get(self, request: HttpRequest):
		friendships = Friendship.objects.select_related('user1', 'user2')\
  						.filter(
            				Q(user1=self.request.user) | Q(user2=self.request.user),
                			accepted=True
                   		)
		friends_ids = [self.get_friend_id(self.request.user, friendship) for friendship in friendships]
		online_friends = [id for id in friends_ids if redis_instance.scard(f"chat:{id}") != 0]
		return JsonResponse(online_friends, safe=False)


	def get_friend_id(self, user, friendship: Friendship):
		return friendship.user1.id if friendship.user1.id != user.id else friendship.user2.id

		

