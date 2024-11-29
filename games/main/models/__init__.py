from django.db import models

from .Invitation import Invitation
from .Notification import Notification
from .Match import Match

from shared_models.models import SharedUser



class StatusChoices(models.TextChoices):
    CONNECTED               = "CONNECT", "Connected"
    WAITING_FOR_SOMEONE     = "SOMEONE", "Waiting for someone" # random match
    WAITING_FOR_A_FRIEND    = "FRIEND", "Waiting for a firend" # friend match
    WAITING_FOR_ADVERSARY   = "ADVERSARY", "Wiating for adversary" # tournament match
    READY                   = "RD", "Ready"
    PLAYING                 = "PL", "Playing"
    
class User(SharedUser):
    class Meta:
        db_table = 'users_user'
        managed = False