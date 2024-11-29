
from shared_models.models import Match, MatchStatus, Games
# from django.db import models
# from django.conf import settings
# from tournaments.models import Tournament

# # Create your models here.
# class MatchStatus(models.TextChoices):
#     PENDING = "PEND", "Pending"
#     FINISHED = "FINISH", "Finished"

# class Match(models.Model):
#     p1 = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.DO_NOTHING, related_name="p1")
#     p2 = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.DO_NOTHING, related_name="p2")
#     p1_score = models.SmallIntegerField(default=0)
#     p2_score = models.SmallIntegerField(default=0)
#     tournament = models.ForeignKey(Tournament, on_delete=models.DO_NOTHING, null=True)
#     date = models.DateField(auto_now_add=True)
#     status = models.CharField(max_length=16, choices=MatchStatus.choices, default=MatchStatus.PENDING)
#     round = models.SmallIntegerField(null=True)
