from rest_framework import serializers
from .models import Match

class MatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Match
        fields = ['p1', 'p2', 'p1_score', 'p2_score', 'date', 'status', 'round', 'tournament']
