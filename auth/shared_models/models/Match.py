from django.db import models
from django.conf import settings


from .tournament import Tournament, Games


class MatchStatus(models.TextChoices):
    PENDING = "PEND", "Pending"
    FINISHED = "FINISH", "Finished"
    ONGOING = "ONGOING", "Ongoing"



class Match(models.Model):
    p1 = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="p1")
    p2 = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="p2")
    p1_score = models.SmallIntegerField(default=0)
    p2_score = models.SmallIntegerField(default=0)
    p1_exchange = models.SmallIntegerField(default=0)
    p2_exchange = models.SmallIntegerField(default=0)
    winning_score = models.SmallIntegerField(default=getattr(settings, 'DEFAULT_WINNING_SCORE', 5))
    type    = models.CharField(max_length=8, choices=Games.choices, default=Games.PONG)
    tournament = models.ForeignKey(Tournament, null=True, on_delete=models.SET_NULL)
    date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=16, choices=MatchStatus.choices, default=MatchStatus.PENDING)
    round = models.SmallIntegerField(null=True)
    order = models.PositiveSmallIntegerField(default=0, null=True)

    def save(self, *args, **kwargs) -> None:
        if self.tournament is not None:
            self.winning_score = self.tournament.win_score
        return super(Match, self).save(*args, **kwargs)

    # class Meta:
    #     managed = getattr(settings, "MANAGE_SHARED_MODELS", False)
