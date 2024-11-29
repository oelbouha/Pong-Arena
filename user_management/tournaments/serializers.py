from rest_framework import serializers
from .models import Tournament
from django.db.models import F

from users.serializers import UserSerializer

from shared_models.models import Games, Match

import json
import sys

class TournamentSerializer(serializers.ModelSerializer):
    image = serializers.ImageField(use_url=False)
    participants_count = serializers.IntegerField(source='participant_set.count', read_only=True)
    admin = serializers.SerializerMethodField('get_admin')
    participants = serializers.SerializerMethodField('get_participants')
    history = serializers.SerializerMethodField('get_matches')

    class Meta:
        model = Tournament
        fields = ['id', 'name', 'game', 'image', 'capacity', 'win_score', 'created_at', 'participants_count', 'admin', 'participants', 'status', 'rounds', 'current_round', 'history']
        read_only_fields = ['id', 'created_by', 'participants_count', 'created_at', 'status']

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['participants_count'] = 0
        validated_data['created_by_id'] = user.id
        validated_data['game'] = Games.PONG if validated_data['game'].lower() == 'pong' else Games.SLAP
        
        tournament = Tournament.objects.create(**validated_data)
        return tournament
        
        
    def get_admin(self, obj):
        serializer = UserSerializer(obj.created_by, friend=False)
        return serializer.data
    
    
    def get_participants(self, obj):
        user_fields = ['id', 'profile_image', 'username', 'first_name', 'last_name']
        values = [F(f'user__{field}') for field in user_fields]
        values_dict = dict(zip(user_fields, values))
        query_set = obj.participant_set.values().annotate(**values_dict).values(*user_fields)
        return [ participant for participant in query_set]
    

    def get_matches(self, obj):
        matches = obj.match_set.all()
        serializer = MatchSerializer(matches, many=True)
        return serializer.data
    


class MatchSerializer(serializers.ModelSerializer):
    p1 = serializers.SerializerMethodField('get_player_1')
    p2 = serializers.SerializerMethodField('get_player_2')
    class Meta:
        model = Match
        fields = [
            'id', 'p1', 'p2', 'p1_score', 'p2_score', 'p1_exchange', 'p2_exchange',
            'winning_score', 'type', 'tournament', 'date', 'status', 'round', 'order'
        ]
        read_only_fields = ['id', 'p1_score', 'p2_score', 'p1_exchange', 'p2_exchange', 'tournament', 'date', 'status', 'round']
        

    def get_player_1(self, obj):
        serializer = UserSerializer(obj.p1, friend=False)
        return serializer.data
    
    
    def get_player_2(self, obj):
        serializer = UserSerializer(obj.p2, friend=False)
        return serializer.data