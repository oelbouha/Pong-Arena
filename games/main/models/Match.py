from shared_models.models import Match, MatchStatus, Games as MatchType

# from typing import Iterable
# from django.db import models
# from django.conf import settings

# from tournaments.models import Tournament

# class MatchStatus(models.TextChoices):
#     PENDING = "PEND", "Pending"
#     FINISHED = "FINISH", "Finished"


# class MatchType(models.TextChoices):
#     PONG = "PONG", "Pong"
#     SLAP = "SLAP", "Slap"

# class Match(models.Model):
#     p1 = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="p1")
#     p2 = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="p2")
#     p1_score = models.SmallIntegerField(default=0)
#     p2_score = models.SmallIntegerField(default=0)
#     p1_exchange = models.SmallIntegerField(default=0)
#     p2_exchange = models.SmallIntegerField(default=0)
#     winning_score = models.SmallIntegerField(default=settings.DEFAULT_WINNING_SCORE)
#     type    = models.CharField(max_length=8, choices=MatchType.choices, default=MatchType.PONG)
#     tournament = models.ForeignKey(Tournament, null=True, on_delete=models.SET_NULL)
#     date = models.DateField(auto_now_add=True)
#     status = models.CharField(max_length=16, choices=MatchStatus.choices, default=MatchStatus.PENDING)
#     round = models.SmallIntegerField(null=True)

#     def save(self, *args, **kwargs) -> None:
#         if self.tournament is not None:
#             self.winning_score = self.tournament.winnig_score
#         return super(Match, self).save(*args, **kwargs)

#     class Meta:
#         db_table = 'match'
#         # managed = False

