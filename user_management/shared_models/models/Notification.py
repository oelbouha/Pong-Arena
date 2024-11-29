from django.db import models
from django.conf import settings



class Notification(models.Model):
    target = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.JSONField()
    seen = models.BooleanField(default=False)

    # class Meta:
    #     managed = getattr(settings, "MANAGE_SHARED_MODELS", False)