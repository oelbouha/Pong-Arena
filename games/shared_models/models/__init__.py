# from .Block import Block
from .Friendship import Friendship
from .Invitation import Invitation, InvitationStatusChoices
from .Match import Match, Games, MatchStatus
from .Notification import Notification
from .tournament import Tournament, TournamentStatus, TournamentTypes, Participant

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.conf import settings
from django.utils.deconstruct import deconstructible

import os

@deconstructible
class PathAndRename(object):
    def __init__(self, sub_path):
        self.path = sub_path

    def __call__(self, instance, filename):
        ext = filename.split('.')[-1]
        filename = '{}.{}'.format(instance.pk, ext)
        return os.path.join(self.path, filename)

avatars = PathAndRename("avatars/")
banners = PathAndRename("banners/")
tournament_images = PathAndRename("tournaments/")


class SharedUser(AbstractUser):    
    email = models.EmailField(unique=True, blank=True)
    profile_image = models.ImageField(upload_to=avatars, blank=True, null=True)
    profile_banner = models.ImageField(upload_to=banners, blank=True, null=True)
    date_joined = models.DateTimeField(default=timezone.now)
    verified = models.BooleanField(default=False)
    provider = models.CharField(max_length=25, default='')
    
    level = models.PositiveIntegerField(default=1)
    exp = models.PositiveIntegerField(default=0)
    xp_next_level = models.PositiveIntegerField(default=100)
    win_streak = models.PositiveIntegerField(default=0)
    won = models.PositiveIntegerField(default=0)
    lost = models.PositiveIntegerField(default=0)
    
    REQUIRED_FIELDS = ['first_name', 'last_name', 'email']
    
    class Meta(AbstractUser.Meta):
        abstract = True

    
    def __str__(self):
        return self.email
    
