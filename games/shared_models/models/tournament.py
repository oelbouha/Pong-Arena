import math
import secrets

from django.db import models
from django.conf import settings
from django.utils.crypto import get_random_string

from django.db import models
from django.conf import settings
from django.utils.deconstruct import deconstructible

import os

@deconstructible
class PathAndRename(object):
    def __init__(self, sub_path):
        self.path = sub_path

    def __call__(self, instance, filename):
        ext = filename.split('.')[-1]
        filename = '{}.{}'.format(instance.id, ext)
        return os.path.join(self.path, filename)

tournament_images = PathAndRename("tournaments/")

class Games(models.TextChoices):
    PONG = "PONG", "Pong"
    SLAP = "SLAP", "Slap"
    

class TournamentTypes(models.TextChoices):
    PUBLIC = "PUB", "Public"
    PRIVATE = "PRV", "Private"


class TournamentStatus(models.TextChoices):
    PENDING = "PEND", "Pending"
    LOCKED = "LOCK",  "Locked"
    ONGOING = "ONGO", "Ongoing"
    FINISHED = "FINISH", "Finished"



class Tournament(models.Model):
    id                  = models.CharField(primary_key=True, max_length=32)
    name                = models.CharField(max_length=255)
    game                = models.CharField(max_length=8, choices=Games.choices, default=Games.PONG)
    image               = models.ImageField(upload_to=tournament_images, blank=True, null=True)
    capacity            = models.SmallIntegerField(default=16)
    created_at          = models.DateTimeField(auto_now_add=True)
    win_score           = models.SmallIntegerField(default=5)
    type                = models.CharField(max_length=16, choices=TournamentTypes.choices, default=TournamentTypes.PUBLIC)
    private_key         = models.CharField(max_length=128, null=True)
    status              = models.CharField(max_length=16, choices=TournamentStatus.choices, default=TournamentStatus.PENDING)
    created_by          = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    current_round       = models.SmallIntegerField(default=1)
    rounds              = models.SmallIntegerField(default=2)
    participants_count  = models.PositiveIntegerField(default=1)

    class Meta:
        managed = getattr(settings, "MANAGE_SHARED_MODELS", False)
    
    def generate_id(self):
        tournament_id = secrets.token_hex(16)
        exists = Tournament.objects.filter(id=tournament_id).exists()
        if exists:
            return self.generate_id()
        return tournament_id
    
    
    def save(self, *args, **kwargs) -> None:
        if not self.id:
            self.id = self.generate_id()
        if self.type == TournamentTypes.PRIVATE:
            self.private_key = get_random_string(16)
        
        if self.status ==  TournamentStatus.LOCKED:
            self.rounds = int(math.log2(self.capacity))
        return super(Tournament, self).save(*args, **kwargs)


    def get_formatted(self):
        formatted =  {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'capacity': self.capacity,
            'type': self.get_type_display(),
            'status': self.get_status_display(),
            'round': self.current_round,
            'created_by':  self.created_by.username # TODO created by and participants goes here
        }

        if self.type == TournamentTypes.PRIVATE:
            formatted['private_key'] = self.private_key

        return formatted

    def __str__(self):
        return self.name

 
class Participant(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE)
    round = models.SmallIntegerField(default=1)
    
    class Meta:
        db_table = 'tournaments_participant'
