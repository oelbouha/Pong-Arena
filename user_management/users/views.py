from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.decorators import action
from friends.models import Friendship
from game.models import Match
from .models import User , Achievement
from .serializers import UserSerializer, AchievementSerializer
from tournaments.serializers import TournamentSerializer, MatchSerializer
from django.db.models import Q, Value, CharField, F
from django.db.models.functions import Concat

from shared_models.models import Tournament, Games
from shared_models.utils import notify

import sys

PAGE_SIZE = 3

# "2024-11-29 00:56:22.913349+00"
# "2024-11-29 00:56:22.898577+00"

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_user_data(self, user):
        history = Match.objects.filter(Q(p1=user) | Q(p2=user)).order_by('-date')[:PAGE_SIZE]
        pong = Match.objects.filter(Q(p1=user, type=Games.PONG) | Q(p2=user, type=Games.PONG)).order_by('-date')[:30]
        slap = Match.objects.filter(Q(p1=user, type=Games.SLAP) | Q(p2=user, type=Games.SLAP)).order_by('-date')[:30]
        tournaments = [
            *list(user.tournament_set.all()),
            *list(Tournament.objects.filter(
                id__in=user.participant_set.values_list('tournament_id', flat=True)
            ))
        ]
        friends = Friendship.objects.filter(Q(user1=user) | Q(user2=user), accepted=True)
        friends = [f.user1 if f.user2.id == user.id else f.user2 for f in friends]
        
        pong_games = Match.objects.filter((Q(p1=user) | Q(p2=user)) & (Q(type=Games.PONG)))
        slap_games = Match.objects.filter((Q(p1=user) | Q(p2=user)) & (Q(type=Games.SLAP)))
        pong_count  = pong_games.count()
        pong_won    = pong_games.filter((Q(p1=user) & Q(p1_score__gt=F('p2_score'))) | (Q(p2=user) & Q(p2_score__gt=F('p1_score')))).count()
        slap_count  = slap_games.count()
        slap_won    = slap_games.filter((Q(p1=user) & Q(p1_score__lt=F('p2_score'))) | (Q(p2=user) & Q(p2_score__lt=F('p1_score')))).count()


        serializer = self.get_serializer(user)
        tournament_serializer = TournamentSerializer(tournaments, many=True)
        match_serializer = MatchSerializer(history, many=True)
        pong_serializer = MatchSerializer(pong, many=True)
        slap_serializer = MatchSerializer(slap, many=True)
        friends_serializer = self.get_serializer(friends, many=True, friend=True)

        user_data = serializer.data
        user_data['tournaments'] = tournament_serializer.data
        user_data['history'] = match_serializer.data
        user_data['pong'] = pong_serializer.data
        user_data['slap'] = slap_serializer.data
        user_data['friends'] = friends_serializer.data
        user_data['pong_count']     = pong_count
        user_data['pong_wins']      = pong_won
        user_data['slap_count']     = slap_count
        user_data['slap_wins']      = slap_won
        
        return user_data
    
    
    def retrieve(self, request, *args, **kwargs):
        user = self.get_object()
        response_data = self.get_user_data(user)
        return Response(response_data)
    
    @action(methods=['get'], detail=True)
    def basic(self, req, **kwargs):
        user = self.get_object()
        serializer = self.get_serializer(user)
        return Response(serializer.data)

    @action(methods=['get'], detail=False, url_path=r'(?P<username>[a-z][\.\w-]+)')
    def user(self, request, username=None):
        user = User.objects.get(username=username)
        data = self.get_user_data(user)
        return Response(data)


    @action(detail=False, methods=['get'])
    def me(self, request:Request):
        user = request.user
        response_data = self.get_user_data(user)
        return Response(response_data)
    
    
    def update(self, request, *args, **kwargs):
        res = super().update(request, *args, **kwargs)
        if res.status_code / 100 == 2:
            notify(int(kwargs['pk']), save=False, type='user_update')
        return res
            
     
    @action(detail=True, methods=['get'])
    def friends(self, request):
        user = request.user
        friends = Friendship.objects.filter(Q(user1=user) | Q(user2=user), accepted=True)
        return Response({'friends': [str(friend) for friend in friends]}, status=200)  

    
    @action(detail=True, methods=['get'])
    def history(self, request, **kwargs):
        page = int(request.query_params.get('q') or 1) - 1
        page = page if page >= 0 else 0
        user = self.get_object()
        
        offset = page * PAGE_SIZE
        
        history = Match.objects.filter(Q(p1=user) | Q(p2=user)).order_by('-date')[offset:offset + PAGE_SIZE]
        match_serializer = MatchSerializer(history, many=True)
        return Response(match_serializer.data)
        
    

    @action(detail=True, methods=['post'])
    def block(self, request, *args, **kwargs):
        me = request.user
        user = self.get_object()
        friendship = Friendship.objects.filter(Q(user1=me, user2=user) | Q(user1=user, user2=me))
        if friendship.exists():
            friendship = friendship.first()
            if friendship.user1 == me:
                friendship.user2_blocked = True
            else:
                friendship.user1_blocked = True
            friendship.save()
        else:
            Friendship.objects.create(user1=me, user2=user, accepted=False, user2_blocked=True)
        
        return Response({'detail': 'user has been blocked'}, status=200)
    
    
    @action(detail=True, methods=['post'])
    def unblock(self, request, *args, **kwargs):
        me = request.user
        user = self.get_object()
        friendship = Friendship.objects.get(Q(user1=me, user2=user) | Q(user1=user, user2=me))
        if friendship:
            if friendship.user1 == me:
                friendship.user2_blocked = False
            else:
                friendship.user1_blocked = False
            
            if not friendship.user1_blocked and not friendship.user2_blocked and not friendship.accepted:
                friendship.delete()
            else:
                friendship.save()
            return Response({'detail': 'User has been unblocked'})
        
        return Response({'detail': 'User is not blocked'}, status=400)  


    @action(detail=False, methods=['patch'], url_path='me')
    def update_profile(self, request):
        user = request.user
        if user is None:
            return Response({'error': 'user_id  must be provided'}, status=400)

        if not user:
            return Response({'error': 'User not found'}, status=404)

        serializer = UserSerializer(user, data=request.data, partial=True) 
        print('updating user', file=sys.stderr)
        if serializer.is_valid():
            serializer.save()
            notify(user.id, save=False, type='user_update')
            return Response(serializer.data)  # Return updated user data
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


    @action(detail=False, methods=['get'], url_path='search')
    def search_users(self, request):
        query = request.query_params.get('q')
        users = User.objects.none()
        if query:
            first_last_name = User.objects.annotate(
                name=Concat('first_name', Value(' '), 'last_name', output_field=CharField())
            )
            last_first_name = User.objects.annotate(
                name=Concat('last_name', Value(' '), 'first_name', output_field=CharField())
            )
            users = [
                *list(User.objects.filter(username__icontains=query)),
                *list(first_last_name.filter(name__icontains=query)),
                *list(last_first_name.filter(name__icontains=query)),
            ]
            users = list(set(users))
        return Response(UserSerializer(users, user_id=request.user.id, many=True).data, status=200)


    def check_and_award_achievements(self, user):
        achievements = Achievement.objects.all()
        user = self.get_object()
        # TODO when a player wins a match,
        # TODO give him his points and check if they have won enough matches to get an achievement
        for achievement in achievements:
            if (user.won >= achievement.required_wins and
                user.level >= achievement.required_levels and
                achievement not in user.achievements.all()):
                user.achievements.add(achievement)


    def destroy(self, request, *args, **kwargs):
        user = self.get_object() 
        if user != request.user: 
            return Response({"detail": "You can only delete your own account."}, status=status.HTTP_403_FORBIDDEN)
        
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AchievementsViewSet(viewsets.ModelViewSet):
    queryset = Achievement.objects.all()
    serializer_class = AchievementSerializer
    # permission_classes = [IsAuthenticated] 

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
