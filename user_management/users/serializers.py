from django.conf import settings
from django.db.models import Q

from rest_framework import serializers
from rest_framework.fields import empty

from friends.models import Friendship, FriendRequest
from game.models import Match
from .models import User,  Achievement


import os
import sys

def delete_file(path_file):
    if os.path.exists(path_file):
        os.remove(path_file)
    
def move_file(file_path, new_file_path):
    pass


class AchievementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Achievement
        fields = ['id', 'name', 'description', 'icon', 'achieved_on', 'user',]


class UserSerializer(serializers.ModelSerializer):
    profile_image = serializers.ImageField(use_url=False)
    profile_banner = serializers.ImageField(use_url=False)
    is_friend = serializers.SerializerMethodField('get_is_friend')
    
    def __init__(self, instance=None, data=empty, **kwargs):
        self.friend = kwargs.pop('friend', None)
        self.user_id = kwargs.pop('user_id', None)
        super(UserSerializer, self).__init__(instance, data, **kwargs)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'profile_image', 'profile_banner', 'date_joined',
            'is_active', 'is_staff', 'is_friend',
            'level', 'exp', 'win_streak', 'won', 'lost'
        ]
        
    def update(self, instance, validated_data):
        if 'profile_image' in validated_data and instance.profile_image:
            delete_file(f'{settings.MEDIA_ROOT}/{instance.profile_image}')
        if 'profile_banner' in validated_data and instance.profile_banner:
            delete_file(f'{settings.MEDIA_ROOT}/{instance.profile_banner}')
        
        return super().update(instance, validated_data)


    def get_is_friend(self, obj):
        
        if self.friend is not None:
            return 'yes' if self.friend else 'no'
        
        user =  self.user_id or self.context['request'].user
        friendship = Friendship.objects.filter(Q(user1=user, user2=obj) | Q(user1=obj, user2=user))
        if friendship.exists():
            friendship = friendship.first()
            if (friendship.user1 == user and friendship.user2_blocked) or (friendship.user2 == user and friendship.user1_blocked):
                return 'blocked'
            elif friendship.accepted:
                return 'yes'
        
        friendship_req = FriendRequest.objects.filter(from_user=user, to_user=obj).exists()
        if friendship_req:
            return 'request_sent'
        
        friendship_req = FriendRequest.objects.filter(from_user=obj, to_user=user).exists()
        if friendship_req:
            return 'request_received'
        
        return 'no'
    