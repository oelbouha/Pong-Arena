from django.db import models
from django.conf import settings

from shared_models.models import SharedUser



class User(SharedUser):
    class Meta:
        managed = False
        
    def add_experience(self, xp_amount):
        self.exp += xp_amount

        while self.exp >= self.xp_next_level:
            self.level_up()

    def level_up(self):
        overflow_exp = self.exp - self.xp_next_level
        self.level += 1 
        self.exp = overflow_exp

        # Increasing the XP requirement for the next level, 20% per level
        self.xp_next_level = int(self.xp_next_level * 1.2) 

        self.save()

    def get_match_history(self):
        return Match.objects.filter(Q(p1=self) | Q(p2=self))




class Achievement(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(null=True)
    icon = models.ImageField(upload_to='achievements/', blank=True, null=True)
    required_wins = models.PositiveIntegerField(default=0)
    required_levels = models.PositiveIntegerField(default=0)
    awarded_users = models.ManyToManyField(User, related_name='achievements')
    achieved_on = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

