from django.db import models
from main.models import Conversation
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.conf import settings

class StatusChoices(models.TextChoices):
	SENT = "ST", _("Sent")
	RECEIVED = "RECV", _("Received")
	SEEN = "SN", _("Seen")


class TypeChoices(models.TextChoices):
	TEXT = "TXT", _("Text")
	IMAGE = "IMG", _("Image")
	VIDEO = "VD", _("Video")
	VOICE = "VC", _("Voice")
	ATTACHMENT = "ATT", _("Attachment")
	INVITATION = "INVITE", _("Invitation")
	

class Message(models.Model):
	conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE)
	sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.DO_NOTHING, related_name="sender")
	recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.DO_NOTHING, related_name="recipient")
	type = models.CharField(max_length=10, choices=TypeChoices.choices, default=TypeChoices.TEXT)
	status = models.CharField(max_length=4, choices=StatusChoices.choices, default=StatusChoices.SENT)
	time = models.DateTimeField(default=timezone.now)
	content = models.TextField()

	@classmethod
	def get_messages_between_users(cls, user1, user2):
		return cls.objects.filter(
			models.Q(sender=user1, recipient=user2) |
			models.Q(sender=user2, recipient=user1)
		).order_by('-time')
	
 
	def __str__(self) -> str:
		return f"msg {self.time.date()} at {self.time.time().hour}:{self.time.time().hour}"


	# class Meta:
	# 	db_table = 'message'
		# managed = False
