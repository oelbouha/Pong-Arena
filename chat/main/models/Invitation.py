from django.db import models
from django.conf import settings

class InvitationStatusChoices(models.TextChoices):
    PENDING = "PEND", "Pending"
    ACCEPTED = "ACCEPT", "Accepted"
    DENIED = "DENIED", "Denied"


class Invitation(models.Model):
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="inv_sender")
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="inv_recipient")
    created = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=16, choices=InvitationStatusChoices.choices, default=InvitationStatusChoices.PENDING)

    # class Meta:
    #     db_table = 'invitation'
    #     managed = False
