from django.db import models
from django.conf import settings


from shared_models.models import Tournament, TournamentStatus, TournamentTypes

class Participant(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE)
    round = models.SmallIntegerField(default=1)


    
