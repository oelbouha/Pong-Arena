from django.db import models
from django.conf import settings


class Friendship(models.Model):
    user1 = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='friends1', on_delete=models.CASCADE)
    user2 = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='friends2', on_delete=models.CASCADE)
    accepted = models.BooleanField(default=True)
    user1_blocked = models.BooleanField(default=False)
    user2_blocked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user1} x {self.user2}"
    
    # class Meta:
        # db_table = 'friends_friendship'
        # managed = getattr(settings, "MANAGE_SHARED_MODELS", False)