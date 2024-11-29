from django.db.models import Q, OuterRef, Subquery

from .Conversation import Conversation
from .Message import Message, TypeChoices, StatusChoices

from shared_models.models import Invitation, InvitationStatusChoices
from shared_models.models import Notification
from shared_models.models import Friendship, SharedUser

class User(SharedUser):
    class Meta:
        db_table = 'users_user'
        managed = False
        
    def get_formatted(self):
        return {
            'id': self.id,
            'username': self.username,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'profile_image': self.profile_image.name
        }
    
    def can_send_to(self, user_id):
        return not Friendship.objects.filter(
            Q(user1_id=self.id, user2_id=user_id, user2_blocked=True)
            | Q(user2_id=self.id, user1_id=user_id, user1_blocked=True)
        ).exists()
    
    
    def conversation(self, user_id):
        return Conversation.objects.get( Q(user1=self, user2_id=user_id) | Q(user1_id=user_id, user2=self) )
        
        
    def conversations(self):
        last_msg = Message.objects.filter(conversation_id=OuterRef('pk')).order_by('-time')
        last_recieved_msg = Message.objects.filter(
            conversation_id=OuterRef('pk'),
            recipient=self.id
        ).order_by('-time')[:1]
        return Conversation.objects.filter( Q(user1=self) | Q(user2=self) )\
                .annotate(
                    last_msg_type=Subquery(last_msg.values('type')[:1]),
                    last_msg_sender=Subquery(last_msg.values('sender')[:1]),
                    last_msg_status=Subquery(last_msg.values('status')[:1]),
                    last_msg_content=Subquery(last_msg.values('content')[:1]),
                    last_msg_time=Subquery(last_msg.values('time')[:1]),
                    last_recieved_msg_status=Subquery(last_recieved_msg.values('status'))
                ).order_by('-last_msg_time')
                
        
# conversation
# sender
# recipient
# type
# status
# time
# content