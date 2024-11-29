from django.conf import settings
from django.db import models


class Conversation(models.Model):
	user1 = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.DO_NOTHING, related_name="user1")
	user2 = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.DO_NOTHING, related_name="user2")

  
	def get_formatted(self, last_msg=False):
		convo = {
			'id': self.id,
            'users': [self.user1_id, self.user2_id],
        }
		if last_msg:
			convo['last_msg'] = {
				'type': self.last_msg_type,
				'sender': self.last_msg_sender,
				'status': self.last_msg_status,
				'content': self.last_msg_content,
			}
		return convo

	def formatted_last_msg(self):
		return {
				'type': self.last_msg_type,
				'sender': self.last_msg_sender,
				'status': self.last_msg_status,
				'content': self.last_msg_content,
				'time': self.last_msg_time
			}