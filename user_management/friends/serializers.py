from rest_framework import serializers
from .models import FriendRequest, Friendship

from users.serializers import UserSerializer

class FriendRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = FriendRequest
        fields = ['id', 'from_user', 'to_user', 'accepted', 'created_at']



class FriendshipSerializer(serializers.ModelSerializer):
    class Meta:
        model = Friendship
        fields = ['id', 'user1', 'user2', 'accepted', 'user1_blocked', 'user2_blocked', 'created_at']

import sys

class MyFriendRequestsSerializer(serializers.ModelSerializer):
    sent_from = serializers.SerializerMethodField('get_sent_from_user')
    class Meta:
        model = FriendRequest
        fields = ['id', 'sent_from', 'created_at']
        
    def get_sent_from_user(self, obj):
        print(obj.from_user.username, obj.to_user.username, file=sys.stderr)
        serializer = UserSerializer(obj.from_user, friend=False)
        return serializer.data
