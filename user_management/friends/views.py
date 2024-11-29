from django.db import models
from django.db.models import F, Q
from django.shortcuts import get_object_or_404

from rest_framework.decorators import action
from rest_framework import viewsets, status
from rest_framework.response import Response

from .models import FriendRequest, Friendship
from .serializers import FriendRequestSerializer, FriendshipSerializer, MyFriendRequestsSerializer

from shared_models.utils import notify

def basic_user_data(user):
    return {
            'id': user.id,
            'image': user.profile_image.name,
            'name': f'{user.first_name} {user.last_name}',
            'username': f'{user.username}'
    }

import sys

class FriendRequestViewSet(viewsets.ModelViewSet):
    queryset = FriendRequest.objects.all()
    serializer_class = FriendRequestSerializer
    
    def list(self, request, *args, **kwargs):
        user = request.user
        not_blocked = [
            *list(
                Friendship.objects \
                    .filter(user1=user, user2_blocked=True) \
                    .values_list('user2_id', flat=True)
            ), *list(
                Friendship.objects \
                    .filter(user2=user, user1_blocked=True) \
                    .values_list('user1_id', flat=True)
            )
        ]                            
        requests = FriendRequest.objects.filter(to_user=user).exclude(from_user__in=not_blocked)
        serializer = MyFriendRequestsSerializer(requests, many=True)
        return Response(serializer.data)
    

    def create(self, request, *args, **kwargs):
        user = request.user
        request.data['from_user'] = user.pk
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        from_user = serializer.validated_data.get('from_user')
        to_user = serializer.validated_data.get('to_user')
        

        if from_user == to_user:
            return Response({"detail": "You cannot send a friend request to yourself."}, status=status.HTTP_400_BAD_REQUEST)
        
        # if the other user has sent a request just accept it and get on with it
        friend_request = FriendRequest.objects.filter(from_user=to_user, to_user=from_user)
        if friend_request.exists():
            friend_request = friend_request.first()
            Friendship.objects.create(user1=friend_request.from_user, user2=friend_request.to_user)
            friend_request.delete()
            notify(
                to_user.id,
                type="friend_accepted",
                **basic_user_data(from_user)
            )
            return Response({"detail": "Friend request accepted and friendship created."}, status=status.HTTP_200_OK)
            
        friend_request = FriendRequest.objects.filter(from_user=from_user, to_user=to_user)
        if friend_request.exists():
            return Response(
                {"detail": "Friend request already exists."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        self.perform_create(serializer)
        friend_request = FriendRequest.objects.filter(from_user=from_user, to_user=to_user).first()
        notify(
                to_user.id,
                save=True,
                type="new_friend_request",
                **basic_user_data(from_user),
                request_id=friend_request.id
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    
    @action(detail=False, methods=['post'])
    def accept_request(self, request):
        user = request.user
        request.data['to_user'] = user.pk
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        
        target_user_id = validated['from_user']
        friendship = Friendship.objects.filter(
            (models.Q(user1=user) & models.Q(user2_id=target_user_id)) |
            (models.Q(user1_id=target_user_id) & models.Q(user2=user))
        )
        
        if friendship.exists():
            friendship = friendship.first()
            friendship.accepted = True
            friendship.save()
            friend_request.delete()
            return Response({
                "detail": "Friend request accepted and friendship created."
            })
            
        
        friend_request = get_object_or_404(
            FriendRequest,
            from_user_id=validated['from_user'],
            to_user_id=validated['to_user']
        )

        Friendship.objects.create(user1=friend_request.from_user, user2=friend_request.to_user)
        notify(
            friend_request.from_user.id,
            type="friend_accepted",
            **basic_user_data(friend_request.to_user)
        )
        friend_request.delete()

        return Response({"detail": "Friend request accepted and friendship created."}, status=status.HTTP_200_OK)


    @action(detail=False, methods=['post'])
    def decline_request(self, request):
        user = request.user
        request.data['to_user'] = user.pk
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        
        friend_request = get_object_or_404(
            FriendRequest,
            from_user_id=validated['from_user'],
            to_user_id=validated['to_user']
        )
        notify(
            friend_request.from_user.id,
            type="friend_declined",
            id=friend_request.to_user.id
        )
        friend_request.delete()
        return Response({"detail": "Friend request declined."})


    @action(detail=False, methods=['post'])
    def cancel_request(self, request):
        user = request.user
        request.data['from_user'] = user.pk
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data
        
        friend_request = get_object_or_404(
            FriendRequest,
            from_user_id=validated['from_user'],
            to_user_id=validated['to_user']
        )
        friend_request.delete()
        return Response({"detail": "Friend request canceled."})

    

class FriendshipViewSet(viewsets.ModelViewSet):
    queryset = Friendship.objects.all()
    serializer_class = FriendshipSerializer
    
    def list(self, request, *args, **kwargs):
        friends = Friendship.objects.filter(user1=request.user) | Friendship.objects.filter(user2=request.user)
        serializer = self.get_serializer(friends, many=True)
        return Response(serializer.data)


    def destroy(self, request, pk=None):
        user = request.user
        target_user_id = pk

        if not target_user_id:
            return Response({"detail": "Please provide a user_id."}, status=status.HTTP_400_BAD_REQUEST)

        friendship = Friendship.objects.filter(
            (models.Q(user1=user) & models.Q(user2_id=target_user_id)) |
            (models.Q(user1_id=target_user_id) & models.Q(user2=user))
        ).first()

        if friendship:
            notify(
                pk,
                save=False,
                type="friend_removed",
                id=user.id
            )
            friendship.delete()
            return Response({ 'detail': 'success' }, status=status.HTTP_200_OK)
        else:
            return Response({"detail": "Friendship not found."}, status=status.HTTP_404_NOT_FOUND)
        
