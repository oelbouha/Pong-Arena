from django.db import models
from django.conf import settings

from django.contrib.auth import get_user_model

from shared_models.models import Friendship

User=get_user_model()

# Create your models here.
class FriendRequest(models.Model):
    from_user = models.ForeignKey(User, related_name='sent_requests', on_delete=models.CASCADE)
    to_user = models.ForeignKey(User, related_name='received_requests', on_delete=models.CASCADE)
    accepted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Friend request from {self.from_user} to {self.to_user}"


# class Friendship(models.Model):
#     user1 = models.ForeignKey(User, related_name='friends1', on_delete=models.CASCADE)
#     user2 = models.ForeignKey(User, related_name='friends2', on_delete=models.CASCADE)
#     created_at = models.DateTimeField(auto_now_add=True)

#     def __str__(self):
#         return f"{self.user1} and {self.user2} are friends"